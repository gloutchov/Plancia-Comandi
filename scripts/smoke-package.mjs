import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const executable = path.resolve(process.argv[2] ?? '')
const expectedVersion = process.argv[3]
assert(process.argv[2] && expectedVersion, 'Usage: node scripts/smoke-package.mjs <executable> <version>')
assert(['darwin', 'win32'].includes(process.platform), 'Run on macOS or Windows')
await access(executable)
const root = await mkdtemp(path.join(os.tmpdir(), 'plancia-package-smoke-'))
const userData = path.join(root, 'user-data')
await mkdir(userData)
await mkdir(path.join(root, 'shell'))
const settings = {
  locale: 'en', theme: 'light', layout: 'single', fontSize: 13,
  notifyDesktop: false, notifyBadge: false, lastCwd: root,
}
await writeFile(path.join(userData, 'settings.json'), JSON.stringify(settings))
const server = net.createServer()
await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
const port = server.address().port
await new Promise((resolve) => server.close(resolve))
// Retain only OS/runtime variables, never credentials, demo flags or project data.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(PATH|SystemRoot|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|TMPDIR|LANG|LC_ALL|DISPLAY|XAUTHORITY|__CF_USER_TEXT_ENCODING)$/i.test(key)))
env.ZDOTDIR = path.join(root, 'shell')
env.PLANCIA_SMOKE_VALUE = 'OK'
const child = spawn(executable, [`--user-data-dir=${userData}`, `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1'], {
  cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: false,
})
let exited = false
let launchError
let diagnostics = ''
child.once('error', (error) => { launchError = error })
child.once('exit', () => { exited = true })
for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => {
  diagnostics = (diagnostics + chunk.toString()).slice(-16000)
})
let socket
const pending = new Map()
let nextId = 0
const sessions = []
async function until(task, message, milliseconds = 30000) {
  const deadline = Date.now() + milliseconds
  do {
    if (launchError) throw launchError
    if (exited) throw new Error('Packaged app exited before the smoke test completed')
    const value = await task()
    if (value) return value
    await delay(200)
  } while (Date.now() < deadline)
  throw new Error(message)
}
async function request(method, params = {}) {
  const id = ++nextId
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('Renderer evaluation timed out')) }, 10000)
    pending.set(id, { resolve: (value) => { clearTimeout(timeout); resolve(value) }, reject: (error) => { clearTimeout(timeout); reject(error) } })
    socket.send(JSON.stringify({ id, method, params }))
  })
  return result
}
async function evaluate(expression) {
  const result = await request('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error('Renderer evaluation failed')
  return result.result?.value
}
try {
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
  const boot = await evaluate(`window.plancia.boot().then(b => ({version:b.version, demo:b.demo, cwd:b.settings.lastCwd, count:b.sessions.length}))`)
  assert.equal(boot.version, expectedVersion)
  assert.equal(boot.demo, false)
  assert.equal(boot.cwd, root, 'Refusing to test with non-isolated preferences')
  assert.equal(boot.count, 0)
  for (const [locale, theme] of [['it', 'dark'], ['en', 'light']]) {
    await evaluate(`window.plancia.updateSettings(${JSON.stringify({ locale, theme })})`)
    await request('Page.reload')
    await until(async () => {
      try { return await evaluate(`Boolean(document.querySelector('.app')) && document.documentElement?.lang === '${locale}' && document.documentElement?.dataset.theme === '${theme}'`) }
      catch { return false } // A reload briefly destroys the previous execution context.
    }, 'Language/theme did not update')
  }
  const saved = JSON.parse(await readFile(path.join(userData, 'settings.json'), 'utf8'))
  assert.equal(saved.locale, 'en')
  assert.equal(saved.theme, 'light')
  const shellId = process.platform === 'win32' ? 'cmd' : 'zsh'
  for (let i = 0; i < 3; i += 1) {
    const created = await evaluate(`window.plancia.createSession(${JSON.stringify({ name: `Smoke ${i + 1}`, shellId, cwd: root })})`)
    assert.equal(created.ok, true, 'Native PTY session failed to open')
    sessions.push(created.session.id)
  }
  const id = sessions[0]
  const command = process.platform === 'win32' ? 'echo PLANCIA_SMOKE_%PLANCIA_SMOKE_VALUE%\r' : 'printf \'PLANCIA_SMOKE_%s\\n\' "$PLANCIA_SMOKE_VALUE"\r'
  await evaluate(`window.plancia.write(${JSON.stringify(id)}, ${JSON.stringify(command)})`)
  await until(() => evaluate(`window.plancia.subscribe(${JSON.stringify(id)}).then(s => s.data.includes('PLANCIA_SMOKE_OK'))`), 'Native PTY command produced no expected output')
  for (const layout of ['split', 'stack', 'grid', 'single']) {
    await evaluate(`document.querySelector('[data-testid="layout-${layout}"]').click()`)
    await until(() => evaluate(`document.querySelector('.tiles')?.dataset.layout === '${layout}'`), 'Layout did not update')
  }
  assert.equal(await evaluate('document.querySelectorAll(".xterm").length > 0'), true)
  for (const session of sessions) await evaluate(`window.plancia.closeSession(${JSON.stringify(session)})`)
  sessions.length = 0
  await until(() => evaluate('window.plancia.boot().then(b => b.sessions.length === 0)'), 'PTY sessions did not close')
  assert(!/preload error|ERR_MODULE_NOT_FOUND|Cannot find module|NODE_MODULE_VERSION|UnhandledPromiseRejection/i.test(diagnostics), 'Packaged runtime reported a module/preload error')
  console.log(JSON.stringify({ smoke: 'passed', platform: process.platform, arch: process.arch, version: expectedVersion, checks: ['isolated preferences', 'preload', 'IT/EN', 'light/dark', 'native PTY', 'four layouts', 'session close'], temporaryRoot: root }))
} catch (error) {
  await writeFile(path.join(root, 'runtime-diagnostics.log'), diagnostics)
  throw error
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    for (const id of sessions) await evaluate(`window.plancia.closeSession(${JSON.stringify(id)})`).catch(() => {})
    socket.close()
  }
  if (!exited && child.pid) {
    if (process.platform === 'win32') spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    else child.kill('SIGTERM')
  }
  console.log(`Smoke-test files retained at ${root}`)
}
