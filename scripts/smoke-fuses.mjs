import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
  assertDefaultFuses,
  assertOnlyFuseWireDiffers,
  assertReleaseFuses,
  pathToFuseFile,
  readFuseStates,
} from './electron-fuses.mjs'
import { processExitDetail, runAsNodeOutcome } from './fuse-smoke-cases.mjs'
import { smokeEnvironment } from './smoke-driver.mjs'

const releaseExecutable = path.resolve(process.argv[2] ?? '')
const openExecutable = path.resolve(process.argv[3] ?? '')
assert(process.argv[2] && process.argv[3], 'Usage: node scripts/smoke-fuses.mjs <release-executable> <open-fuse-executable>')
assert(['darwin', 'win32'].includes(process.platform), 'Fuse smoke runs on macOS or Windows')

const root = await mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'plancia-fuse-smoke-'))
let profile = 0
let current = null

function caseDir() {
  profile += 1
  return path.join(root, `case-${profile}`)
}

async function prepareCase(dir) {
  const env = smokeEnvironment(dir)
  // Windows attaches a console when ELECTRON_RUN_AS_NODE is set, even if the
  // runAsNode fuse is off (electron_main_win.cc). Skip that attach for the GUI.
  env.ELECTRON_NO_ATTACH_CONSOLE = '1'
  const userData = path.join(dir, 'user-data')
  await Promise.all([
    ...Object.entries(env)
      .filter(([key]) => /^(HOME|USERPROFILE|APPDATA|LOCALAPPDATA|XDG_|ZDOTDIR)/.test(key))
      .map(([, value]) => mkdir(value, { recursive: true })),
    mkdir(userData, { recursive: true }),
  ])
  return { env, userData }
}

function execText(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { windowsHide: true, timeout: 8000, encoding: 'utf8' }, (error, stdout, stderr) => {
      resolve(`${stdout || ''}${error && !stdout ? stderr || '' : ''}`)
    })
  })
}

async function appPids(executable) {
  if (process.platform === 'win32') {
    const literal = `'${executable.replaceAll("'", "''")}'`
    const text = await execText('powershell.exe', ['-NoProfile', '-Command',
      `Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq ${literal} } | ForEach-Object { $_.ProcessId }`])
    return [...new Set(text.split(/\s+/).map(Number).filter(pid => Number.isInteger(pid) && pid > 0))]
  }
  const text = await execText('ps', ['-eo', 'pid=,args='])
  const pids = []
  for (const line of text.split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(.*)$/)
    if (!match) continue
    const args = match[2]
    if (args === executable || args.startsWith(`${executable} `)) pids.push(Number(match[1]))
  }
  return pids
}

async function taskkill(pid) {
  await new Promise((resolve) => {
    const killer = spawn('taskkill.exe', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
    killer.once('exit', resolve)
    killer.once('error', resolve)
  })
}

function start(executable, args, env, extraEnv = {}) {
  const child = spawn(executable, args, {
    cwd: root,
    env: { ...env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  const state = { output: '', code: null, signal: null, exited: false, error: null, pid: child.pid ?? null }
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => { state.output = (state.output + chunk.toString()).slice(-4000) })
  }
  child.once('exit', (code, signal) => { state.exited = true; state.code = code; state.signal = signal })
  child.once('error', (error) => { state.exited = true; state.error = error.message })
  const handle = { child, state, executable, stopped: false, remaining: [] }
  current = handle
  return handle
}

async function stillRunning(handle) {
  if (!handle.state.exited) return true
  handle.remaining = await appPids(handle.executable)
  return handle.remaining.length > 0
}

async function stop(handle) {
  if (!handle || handle.stopped) return
  handle.stopped = true
  const pid = handle.state.pid
  if (process.platform === 'win32' && pid) await taskkill(pid)
  else if (!handle.state.exited) handle.child.kill('SIGTERM')
  const deadline = Date.now() + 8000
  while (!handle.state.exited && Date.now() < deadline) await delay(100)
  let left = await appPids(handle.executable)
  for (const extra of left) {
    if (process.platform === 'win32') await taskkill(extra)
    else try { process.kill(extra, 'SIGTERM') } catch { /* already gone */ }
  }
  const again = Date.now() + 3000
  while (left.length && Date.now() < again) {
    await delay(100)
    left = await appPids(handle.executable)
  }
  handle.remaining = left
  if (left.length) throw new Error(`App process still running after stop: ${left.join(',')}`)
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    const done = (open) => { socket.destroy(); resolve(open) }
    socket.setTimeout(300)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

async function freePort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

function earlyExit(message, handle) {
  const detail = processExitDetail(handle.state)
  detail.remaining = handle.remaining
  const error = new assert.AssertionError({ message: `${message} ${JSON.stringify(detail)}`, actual: handle.state.exited, expected: false })
  error.exitCode = detail.exitCode
  error.signal = detail.signal
  return error
}

async function recordFailure(name, binary, error, handle) {
  const detail = handle ? processExitDetail(handle.state) : processExitDetail(null)
  await writeFile(path.join(root, 'smoke-failure.json'), JSON.stringify({
    case: name,
    binary,
    pid: detail.pid,
    exitCode: detail.exitCode,
    exitSignal: detail.signal,
    spawnError: detail.spawnError,
    outputTail: detail.outputTail || String(error.message || '').slice(-2000),
  }, null, 2))
  console.log(JSON.stringify({ case: name, binary, outcome: 'failed', durationMs: error.durationMs, exitCode: detail.exitCode, signal: detail.signal }))
}

async function runCase(name, executable, role, fn) {
  const started = Date.now()
  const binary = `${role}:${path.basename(executable)}`
  let outcome = 'passed'
  let failure = null
  try {
    const result = await fn()
    if (typeof result === 'string') outcome = result
  } catch (error) {
    error.durationMs = Date.now() - started
    failure = error
  }
  const handle = current
  let stopFailure = null
  try {
    await stop(handle)
  } catch (error) {
    error.durationMs = Date.now() - started
    stopFailure = error
  }
  current = null
  const error = failure || stopFailure
  if (error) {
    await recordFailure(name, binary, error, handle)
    throw error
  }
  console.log(JSON.stringify({ case: name, binary, outcome, durationMs: Date.now() - started }))
}

async function expectInspector(executable, profile, prefix, shouldListen) {
  const port = await freePort()
  const handle = start(executable, [`--user-data-dir=${profile.userData}`, `${prefix}=127.0.0.1:${port}`], profile.env)
  await delay(800)
  if (!await stillRunning(handle)) throw earlyExit(`${prefix} process exited before the port check`, handle)
  let seen = false
  const deadline = Date.now() + 8000
  while (await stillRunning(handle) && Date.now() < deadline) {
    if (await portOpen(port)) { seen = true; break }
    await delay(200)
  }
  assert.equal(seen, shouldListen, `${prefix} listener ${shouldListen ? 'missing' : 'unexpected'} ${JSON.stringify(processExitDetail(handle.state))}`)
  return shouldListen ? 'listening' : 'closed'
}

// Packaged Electron 45.3.2 drops --inspect from NODE_OPTIONS even when the
// nodeOptions fuse is on. shell/common/node_bindings.cc keeps only
// --http-parser and --max-http-header-size. Both binaries must stay closed.
async function expectNodeOptions(executable, profile) {
  const port = await freePort()
  const handle = start(executable, [`--user-data-dir=${profile.userData}`], profile.env, { NODE_OPTIONS: `--inspect=127.0.0.1:${port}` })
  await delay(800)
  if (!await stillRunning(handle)) throw earlyExit('NODE_OPTIONS process exited before the port check', handle)
  let seen = false
  const deadline = Date.now() + 8000
  while (await stillRunning(handle) && Date.now() < deadline) {
    if (await portOpen(port)) { seen = true; break }
    await delay(200)
  }
  assert.equal(seen, false, `NODE_OPTIONS --inspect opened a port in a packaged app ${JSON.stringify(processExitDetail(handle.state))}`)
  return 'closed'
}

async function expectRunAsNode(executable, profile, shouldRun) {
  const marker = path.join(path.dirname(profile.userData), 'node-marker')
  // No --user-data-dir: Node would treat it as its own flag when the fuse is
  // on. The case directory's HOME and APPDATA are the isolated profile.
  const handle = start(executable, ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`], profile.env, { ELECTRON_RUN_AS_NODE: '1' })
  const deadline = Date.now() + 6000
  while (!handle.state.exited && Date.now() < deadline) await delay(100)
  let written = false
  try { written = (await readFile(marker, 'utf8')) === 'ran' } catch { written = false }
  const alive = await stillRunning(handle)
  const outcome = runAsNodeOutcome({ shouldRun, written, alive })
  if (!outcome) throw earlyExit(`ELECTRON_RUN_AS_NODE ${shouldRun ? 'did not run' : 'exited before the app stayed up'}`, handle)
  return outcome
}

async function expectSignal(executable, profile, shouldOpen) {
  if (process.platform !== 'darwin') return 'skipped'
  const handle = start(executable, [`--user-data-dir=${profile.userData}`], profile.env)
  await delay(1000)
  if (!await stillRunning(handle)) throw earlyExit('App exited before SIGUSR1', handle)
  handle.child.kill('SIGUSR1')
  const deadline = Date.now() + 3000
  while (await stillRunning(handle) && Date.now() < deadline && !/Debugger listening/i.test(handle.state.output)) await delay(100)
  const opened = /Debugger listening/i.test(handle.state.output)
  assert.equal(opened, shouldOpen, `SIGUSR1 ${shouldOpen ? 'did not open' : 'opened'} the inspector`)
  return shouldOpen ? 'opened' : 'refused'
}

async function unsignedBytes(file) {
  if (process.platform !== 'darwin') return readFile(file)
  const copy = `${file}.unsigned-${path.basename(file)}`
  const { copyFile } = await import('node:fs/promises')
  await copyFile(file, copy)
  await new Promise((resolve, reject) => {
    const child = spawn('codesign', ['--remove-signature', copy], { stdio: 'ignore' })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`codesign --remove-signature exited ${code}`)))
  })
  return readFile(copy)
}

assertReleaseFuses(await readFuseStates(releaseExecutable))
assertDefaultFuses(await readFuseStates(openExecutable))
assertOnlyFuseWireDiffers(await unsignedBytes(pathToFuseFile(openExecutable)), await unsignedBytes(pathToFuseFile(releaseExecutable)))

for (const [executable, open] of [[releaseExecutable, false], [openExecutable, true]]) {
  const role = open ? 'twin' : 'release'
  await runCase('ELECTRON_RUN_AS_NODE', executable, role, async () => expectRunAsNode(executable, await prepareCase(caseDir()), open))
  await runCase('NODE_OPTIONS', executable, role, async () => expectNodeOptions(executable, await prepareCase(caseDir())))
  await runCase('--inspect', executable, role, async () => expectInspector(executable, await prepareCase(caseDir()), '--inspect', open))
  await runCase('--inspect-brk', executable, role, async () => expectInspector(executable, await prepareCase(caseDir()), '--inspect-brk', open))
  await runCase('SIGUSR1', executable, role, async () => expectSignal(executable, await prepareCase(caseDir()), open))
}

console.log(JSON.stringify({
  fuses: 'passed',
  platform: process.platform,
  wire: process.platform === 'darwin' ? 'unsigned-mach-o-fuse-wire' : 'only-fuse-wire',
  negatives: ['release-blocked', 'twin-open'],
}))
