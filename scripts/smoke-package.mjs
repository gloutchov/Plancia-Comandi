import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { smokeCustomPatterns } from './smoke-custom-patterns.mjs'
import { smokeSettings } from './smoke-settings.mjs'
import { assertLoopbackListener, listenAddressEscapesLoopback, parseListenAddresses, parseNetstatListeners, prepareIsolatedSmokeRoot, isolateBeforeMain } from './smoke-driver.mjs'
import { hasSecuritySmoke, installSecurityProbes, smokeSecurity } from './smoke-security.mjs'
import { smokeFailureMetadata } from './smoke-report.mjs'
import { assertConptyHostFiles, packageSourceDir } from './conpty-host-files.mjs'
import { conptyChildCommand, conptyCloseReport, conptyTimeoutDetail, descendantNamed, descendantPids, mainRejectedFuseClose, packagedListenerPid, packagedListenerPids, parseProcessTable, parseThreadCount, planciaInstanceReport, settleThreadCount, startupFaultEvents, windowsProcessTable, windowsThreadCount } from './conpty-orphans.mjs'
import { extractWindowsElectronExe } from './windows-package-exe.mjs'
import { readStartupTrace, startupCrashEvents } from './fuse-smoke-launch.mjs'
import { restoreSmokeWorkerStartup, smokeWorkerHandshake } from './smoke-worker.mjs'

const executable = path.resolve(process.argv[2] ?? '')
const expectedVersion = process.argv[3]
const mode = process.argv[4] ?? 'full'
assert(process.argv[2] && expectedVersion, 'Usage: node scripts/smoke-package.mjs <executable> <version> [full|release]')
assert(['full', 'release'].includes(mode), 'Smoke mode must be full or release')
assert(['darwin', 'win32'].includes(process.platform), 'Run on macOS or Windows')
await access(executable)
if (process.platform === 'win32') {
  let resources = path.join(path.dirname(executable), 'resources')
  let extracted = null
  if (/-portable\.exe$/i.test(path.basename(executable))) {
    extracted = await extractWindowsElectronExe(executable)
    resources = path.join(path.dirname(extracted.exe), 'resources')
  }
  try {
    console.log(JSON.stringify({ conptyHost: assertConptyHostFiles(resources, packageSourceDir(import.meta.url)) }))
  } finally {
    if (extracted) await rm(extracted.dir, { recursive: true, force: true })
  }
}
const root = await mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'plancia-package-smoke-'))
const { userData, env } = await prepareIsolatedSmokeRoot(root)
env.PLANCIA_DIAG_STARTUP = '1'
env.PLANCIA_DIAG_DIR = root
const server = net.createServer()
await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
const port = server.address().port
const mainServer = net.createServer()
await new Promise((resolve, reject) => mainServer.once('error', reject).listen(0, '127.0.0.1', resolve))
const inspectorPort = mainServer.address().port
assert.notEqual(port, inspectorPort)
await new Promise((resolve) => server.close(resolve))
await new Promise((resolve) => mainServer.close(resolve))
const launchArgs = [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1']
if (mode === 'full') launchArgs.unshift(`--inspect-brk=127.0.0.1:${inspectorPort}`)
const child = spawn(executable, launchArgs, {
  cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: false,
})
let exited = false
let exitCode = null
let exitSignal = null
let launchError
let diagnostics = ''
let failureDetail = ''
child.once('error', (error) => { launchError = error })
child.once('exit', (code, signal) => { exited = true; exitCode = code; exitSignal = signal })
for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => {
  diagnostics = (diagnostics + chunk.toString()).slice(-16000)
})
let socket
let main
const pending = new Map()
let nextId = 0
const sessions = []
let stage = 'launch'
const requests = []
const stageAt = (value) => { stage = value; console.log(`Smoke stage: ${stage}`) }
async function until(task, message, milliseconds = 30000) {
  const deadline = Date.now() + milliseconds
  do {
    if (launchError) throw launchError
    if (exited) throw new Error(`Packaged app exited before the smoke test completed (code ${exitCode}, signal ${exitSignal}): ${diagnostics.slice(-500)}`)
    const value = await task()
    if (value) return value
    await delay(200)
  } while (Date.now() < deadline)
  throw new Error(message)
}
async function request(method, params = {}) {
  const id = ++nextId
  const entry = { id, method, stage, status: 'pending' }
  requests.push(entry)
  if (requests.length > 32) requests.shift()
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { entry.status = 'timeout'; pending.delete(id); reject(new Error(`Renderer ${method} timed out at ${entry.stage}`)) }, 10000)
    pending.set(id, { resolve: (value) => { entry.status = 'resolved'; clearTimeout(timeout); resolve(value) }, reject: (error) => { entry.status = 'rejected'; clearTimeout(timeout); reject(error) } })
    socket.send(JSON.stringify({ id, method, params }))
  })
  return result
}
async function evaluate(expression) {
  const result = await request('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, allowUnsafeEvalBlockedByCSP: false })
  if (result.exceptionDetails) throw new Error('Renderer evaluation failed')
  return result.result?.value
}
function ownedListenText(pid) {
  if (!pid) return Promise.resolve('')
  const command = process.platform === 'win32'
    ? ['netstat', ['-ano', '-p', 'tcp']]
    : ['lsof', ['-nP', '-p', String(pid), '-a', '-iTCP', '-sTCP:LISTEN']]
  return new Promise((resolve) => {
    execFile(command[0], command[1], { timeout: 8000, windowsHide: true }, (error, stdout, stderr) => {
      if (error && !stdout) resolve('')
      else resolve(`${stdout || ''}${stderr || ''}`)
    })
  })
}
const PORTABLE_LISTENER_GAP = 'portable CDP listeners not measured'

async function assertOwnedListeners(pids, portable = false) {
  const list = (Array.isArray(pids) ? pids : [pids]).filter(pid => Number.isInteger(pid) && pid > 0)
  if (list.length === 0) return
  let addresses = []
  let anyText = false
  if (process.platform === 'win32') {
    const text = await ownedListenText(list[0])
    anyText = Boolean(text.trim())
    addresses = [...new Set(list.flatMap(pid => parseNetstatListeners(text, pid)))]
  } else {
    const texts = await Promise.all(list.map(ownedListenText))
    anyText = texts.some(text => text.trim())
    addresses = [...new Set(texts.flatMap(parseListenAddresses))]
  }
  if (!anyText || addresses.length === 0) {
    console.log(portable ? PORTABLE_LISTENER_GAP : JSON.stringify({ listeners: 'unavailable' }))
    return
  }
  console.log(JSON.stringify({ listeners: addresses }))
  assert.equal(addresses.some(listenAddressEscapesLoopback), false, 'A debug listener is not limited to loopback')
}
function portableWrapper() {
  return process.platform === 'win32' && /-portable\.exe$/i.test(path.basename(executable))
}
async function portableProcessRows() {
  if (!portableWrapper()) return []
  try { return parseProcessTable(await windowsProcessTable()) } catch { return [] }
}
function assertNoForkRejection(message) {
  if (mainRejectedFuseClose(diagnostics)) console.log(JSON.stringify({ startupFaults: startupFaultEvents(diagnostics) }))
  assert.equal(mainRejectedFuseClose(diagnostics), false, message)
}
async function assertNoStartupCrash() {
  const events = startupCrashEvents(await readStartupTrace(root))
  assert.equal(events.length, 0, `startup.jsonl recorded ${events.join(',')}`)
}
async function mainThreadCount(pid) {
  let text = ''
  try { text = await windowsThreadCount(pid) } catch (error) {
    throw new Error(`Main thread count is unavailable: ${String(error.message || error).slice(0, 200)}`)
  }
  const count = parseThreadCount(text)
  if (count == null) throw new Error(`Main thread count is unavailable: ${JSON.stringify(String(text).slice(0, 200))}`)
  return count
}
async function windowsConptyCloseCheck(appPid) {
  if (process.platform !== 'win32') return false
  assert.equal(Number.isInteger(appPid) && appPid > 0, true, 'ConPTY check has no extracted plancia-comandi main pid')
  const threadsBefore = await mainThreadCount(appPid)
  stageAt('ConPTY child')
  const created = await evaluate(`window.plancia.createSession(${JSON.stringify({ name: 'Smoke ConPTY', shellId: 'cmd', cwd: root })})`)
  assert.equal(created.ok, true, 'ConPTY session failed to open')
  const id = created.session.id
  const shellPid = created.session.pid
  assert.equal(Number.isInteger(shellPid) && shellPid > 0, true, 'ConPTY shell pid missing')
  const shellRow = parseProcessTable(await windowsProcessTable()).find(row => row.pid === shellPid) || { pid: shellPid }
  sessions.push(id)
  const command = conptyChildCommand()
  await evaluate(`window.plancia.write(${JSON.stringify(id)}, ${JSON.stringify(command)})`)
  const ping = await waitForConptyChild(id, shellPid, command)
  assert.equal(Number.isInteger(ping.pid) && ping.pid > 0, true, 'ConPTY child pid missing')
  stageAt('ConPTY close')
  await evaluate(`window.plancia.closeSession(${JSON.stringify(id)})`)
  const index = sessions.indexOf(id)
  if (index >= 0) sessions.splice(index, 1)
  await until(() => evaluate(`window.plancia.boot().then(b => !b.sessions.some(s => s.id === ${JSON.stringify(id)}))`), 'ConPTY session did not close')
  const samples = []
  await until(async () => {
    const rows = parseProcessTable(await windowsProcessTable())
    samples.push(planciaInstanceReport(rows, appPid))
    const report = conptyCloseReport(rows, shellRow, ping)
    return report.clear && descendantPids(rows, shellPid).length === 0 && !rows.some((row) => row.pid === ping.pid)
  }, 'ConPTY close left the shell, its child, or another child of the shell', 15000)
  await evaluate('window.plancia.boot().then(b => Boolean(b.version))')
  const settled = await settleThreadCount(threadsBefore, () => mainThreadCount(appPid), delay)
  console.log(JSON.stringify({ conptyThreads: { before: settled.before, after: settled.after, last: settled.last, min: settled.min, tolerance: 2 } }))
  assert.equal(settled.ok, true, `Main thread count stayed above ${threadsBefore}+2; last ${settled.last}, min ${settled.min}`)
  const extra = [...new Set(samples.flatMap(sample => sample.extra))]
  const peak = samples.reduce((max, sample) => Math.max(max, sample.count), 0)
  console.log(JSON.stringify({ conptyPlancia: { ownPid: appPid, peak, extra } }))
  assert.equal(extra.length, 0, `node-pty fork started another plancia-comandi instance: ${extra.join(',')}`)
  assertNoForkRejection('Main process reported a fork or unhandled rejection while closing ConPTY')
  await assertNoStartupCrash()
  return true
}
async function waitForConptyChild(id, shellPid, command) {
  const deadline = Date.now() + 30000
  let processes = ''
  while (Date.now() < deadline) {
    processes = await windowsProcessTable()
    const child = descendantNamed(parseProcessTable(processes), shellPid, /ping/i)
    if (child) return child
    await delay(200)
  }
  const terminal = await evaluate(`window.plancia.subscribe(${JSON.stringify(id)}).then(s => s.data)`).catch(() => '')
  failureDetail = JSON.stringify(conptyTimeoutDetail({ command, terminal, processes }))
  console.error(failureDetail)
  throw new Error(`ConPTY child did not appear within 30s: ${failureDetail}`)
}
let smokeError = null
try {
  if (mode === 'full') {
    main = await isolateBeforeMain({ diagnostics: () => diagnostics, until, root, inspectorPort })
    stageAt('isolated before main')
    if (hasSecuritySmoke(expectedVersion)) await installSecurityProbes(main, root)
    await main.resume()
  }
  const page = await until(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })
      return (await response.json()).find((entry) => entry.type === 'page' && entry.url.startsWith('file:'))
    } catch { return null }
  }, 'Packaged renderer did not open')
  socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', ({ data }) => {
    const reply = JSON.parse(data)
    const item = pending.get(reply.id)
    if (!item) return
    pending.delete(reply.id)
    if (reply.error) item.reject(new Error(reply.error.message))
    else item.resolve(reply.result)
  })
  await until(() => evaluate('Boolean(window.plancia && document.querySelector(".app"))'), 'Preload bridge or workspace did not load')
  stageAt('boot metadata')
  const boot = await evaluate(`window.plancia.boot().then(b => ({version:b.version, demo:b.demo, cwd:b.settings.lastCwd, count:b.sessions.length}))`)
  assert.equal(boot.version, expectedVersion)
  assert.equal(boot.demo, false)
  assert.equal(boot.cwd, root, 'Refusing to test with non-isolated preferences')
  assert.equal(boot.count, 0)
  if (mode === 'release') {
    assert(String(page.webSocketDebuggerUrl).startsWith(`ws://127.0.0.1:${port}/`), 'Renderer debugging left 127.0.0.1')
    stageAt('loopback debugging port')
    await assertLoopbackListener(port)
    const portableRows = await portableProcessRows()
    const mainPid = portableWrapper() ? packagedListenerPid(portableRows, child.pid) : child.pid
    const listenerPids = portableWrapper() ? packagedListenerPids(portableRows, child.pid) : [child.pid]
    if (portableWrapper() && !mainPid) console.log(PORTABLE_LISTENER_GAP)
    if (listenerPids.length) await assertOwnedListeners(listenerPids, portableWrapper())
    const checks = ['isolated preferences', 'preload', 'loopback CDP']
    if (await windowsConptyCloseCheck(mainPid)) checks.push('ConPTY child close', 'no orphan', 'no fork rejection')
    else {
      const shellId = process.platform === 'win32' ? 'cmd' : 'zsh'
      stageAt('release PTY create')
      const created = await evaluate(`window.plancia.createSession(${JSON.stringify({ name: 'Smoke release', shellId, cwd: root })})`)
      assert.equal(created.ok, true, 'Native PTY session failed to open')
      sessions.push(created.session.id)
      stageAt('release session close')
      await evaluate(`window.plancia.closeSession(${JSON.stringify(created.session.id)})`)
      sessions.length = 0
      await until(() => evaluate('window.plancia.boot().then(b => b.sessions.length === 0)'), 'PTY sessions did not close')
      checks.push('one native PTY', 'session close')
    }
    assertNoForkRejection('Main process reported a fork or unhandled rejection')
    await assertNoStartupCrash()
    console.log(JSON.stringify({ smoke: 'passed', mode, platform: process.platform, arch: process.arch, version: expectedVersion, checks, temporaryRoot: root }))
  } else {
  for (const [locale, theme] of [['it', 'dark'], ['en', 'light']]) {
    stageAt(`preferences ${locale}/${theme} update`)
    await evaluate(`window.plancia.updateSettings(${JSON.stringify({ locale, theme })})`)
    stageAt(`preferences ${locale}/${theme} reload`)
    await request('Page.reload')
    stageAt(`preferences ${locale}/${theme} render`)
    await until(async () => {
      try { return await evaluate(`Boolean(document.querySelector('.app')) && document.documentElement?.lang === '${locale}' && document.documentElement?.dataset.theme === '${theme}'`) }
      catch { return false } // A reload briefly destroys the previous execution context.
    }, 'Language/theme did not update')
  }
  const saved = JSON.parse(await readFile(path.join(userData, 'settings.json'), 'utf8'))
  assert.equal(saved.locale, 'en')
  assert.equal(saved.theme, 'light')
  const shellId = process.platform === 'win32' ? 'cmd' : 'zsh'
  stageAt('native worker readiness')
  const readiness = await main.evaluate(`(() => { (${restoreSmokeWorkerStartup.toString()})(); return (${smokeWorkerHandshake.toString()})(); })()`)
  assert.equal(readiness.started, true, `A smoke worker inherited debugger suspension (${readiness.wait}; ${readiness.worker}; ${readiness.error || 'no worker error'})`)
  for (let i = 0; i < 3; i += 1) {
    stageAt(`native PTY ${i + 1} create`)
    const created = await evaluate(`window.plancia.createSession(${JSON.stringify({ name: `Smoke ${i + 1}`, shellId, cwd: root })})`)
    assert.equal(created.ok, true, 'Native PTY session failed to open')
    sessions.push(created.session.id)
  }
  const id = sessions[0]
  stageAt('native PTY command')
  const command = process.platform === 'win32' ? 'echo PLANCIA_SMOKE_%PLANCIA_SMOKE_VALUE%\r' : 'printf \'PLANCIA_SMOKE_%s\\n\' "$PLANCIA_SMOKE_VALUE"\r'
  await evaluate(`window.plancia.write(${JSON.stringify(id)}, ${JSON.stringify(command)})`)
  await until(() => evaluate(`window.plancia.subscribe(${JSON.stringify(id)}).then(s => s.data.includes('PLANCIA_SMOKE_OK'))`), 'Native PTY command produced no expected output')
  for (const layout of ['split', 'stack', 'grid', 'single']) {
    stageAt(`layout ${layout}`)
    await evaluate(`document.querySelector('[data-testid="layout-${layout}"]').click()`)
    await until(() => evaluate(`document.querySelector('.tiles')?.dataset.layout === '${layout}'`), 'Layout did not update')
  }
  assert.equal(await evaluate('document.querySelectorAll(".xterm").length > 0'), true)
  stageAt('custom pattern regression')
  const patternsChecked = await smokeCustomPatterns({ evaluate, until, request, sessions, root, expectedVersion })
  stageAt('settings failure regression')
  const settingsChecked = await smokeSettings({ evaluate, until, request, root, userData, expectedVersion })
  stageAt('IPC CSP and permissions')
  const security = hasSecuritySmoke(expectedVersion) ? await smokeSecurity({ main, evaluate, request, until, root, userData, sessions }) : null
  const fullRows = await portableProcessRows()
  const fullMainPid = portableWrapper() ? packagedListenerPid(fullRows, child.pid) : child.pid
  if (portableWrapper() && !fullMainPid) console.log(PORTABLE_LISTENER_GAP)
  const conptyChecked = await windowsConptyCloseCheck(fullMainPid)
  stageAt('session close')
  for (const session of sessions) await evaluate(`window.plancia.closeSession(${JSON.stringify(session)})`)
  sessions.length = 0
  await until(() => evaluate('window.plancia.boot().then(b => b.sessions.length === 0)'), 'PTY sessions did not close')
  assert(!/preload error|ERR_MODULE_NOT_FOUND|Cannot find module|NODE_MODULE_VERSION|UnhandledPromiseRejection/i.test(diagnostics), 'Packaged runtime reported a module/preload error')
  assertNoForkRejection('Main process reported a fork or unhandled rejection')
  await assertNoStartupCrash()
  console.log(JSON.stringify({ smoke: 'passed', platform: process.platform, arch: process.arch, version: expectedVersion, checks: ['early HOME/appData/userData/sessionData isolation', 'isolated preferences', 'preload', 'IT/EN', 'light/dark', 'native PTY', 'four layouts', 'session close', ...(conptyChecked ? ['ConPTY child close', 'no orphan', 'no fork rejection'] : []), ...(patternsChecked ? ['bounded custom regexes', 'bridge responsiveness', 'pattern fallback and recovery'] : []), ...(settingsChecked ? ['protected settings failure', 'localized storage warning', 'save recovery'] : [])], security, temporaryRoot: root }))
  }
} catch (error) {
  smokeError = error
  // Only bounded protocol metadata: never expressions, payloads, settings,
  // terminal output, environment, paths, exception messages or native logs.
  await writeFile(path.join(root, 'smoke-failure.json'), JSON.stringify(smokeFailureMetadata(stage, requests, { exitCode, exitSignal, output: `${diagnostics}\n${failureDetail}` }), null, 2))
  await writeFile(path.join(root, 'runtime-diagnostics.log'), diagnostics)
} finally {
  main?.close()
  if (socket?.readyState === WebSocket.OPEN) {
    for (const id of sessions) await evaluate(`window.plancia.closeSession(${JSON.stringify(id)})`).catch(() => {})
    socket.close()
  }
  if (!exited && child.pid) {
    if (process.platform === 'win32') spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    else child.kill('SIGTERM')
    const deadline = Date.now() + 8000
    while (!exited && Date.now() < deadline) await delay(100)
  }
  if (!exited) {
    const detail = 'Packaged app did not exit within 8000ms'
    if (smokeError) smokeError.exitDetail = detail
    else smokeError = new Error(detail)
  }
  console.log(`Smoke-test files retained at ${root}`)
}
if (smokeError) throw smokeError
