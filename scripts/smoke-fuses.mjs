import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
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
import { HEADER_SIZE_READ, NODE_OPTIONS_HEADER_SIZE, NODE_OPTIONS_IGNORED, NODE_OPTIONS_PROBE, headerSizeFromEvaluation, nodeOptionsOutcome, processExitDetail, reportNodeOptionsMiss, runAsNodeOutcome, startupDiagnostic } from './fuse-smoke-cases.mjs'
import { connectProtocol, mainInspectorUrl } from './smoke-driver.mjs'
import {
  STARTUP_HOLD_MS,
  collectDiagnosticTails,
  launchArgs,
  prepareIsolatedCase,
  readStartupTrace,
  startupCrashEvents,
  reapAppImages,
  spawnTracked,
  stillRunning,
  stopTracked,
} from './fuse-smoke-launch.mjs'

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

function start(executable, args, profile, extraEnv = {}) {
  const handle = spawnTracked(executable, args, profile, extraEnv)
  current = handle
  return handle
}

async function stop(handle) {
  await stopTracked(handle)
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

async function recordFailure(name, binary, error, handle, reap) {
  const detail = handle ? processExitDetail(handle.state) : processExitDetail(null)
  const logs = handle?.profile ? await collectDiagnosticTails([handle.profile.userData, handle.profile.dir]) : []
  const startup = handle?.profile ? await readStartupTrace(handle.profile.dir) : []
  await writeFile(path.join(root, 'smoke-failure.json'), JSON.stringify({
    case: name,
    binary,
    pid: detail.pid,
    exitCode: detail.exitCode,
    exitSignal: detail.signal,
    spawnError: detail.spawnError,
    outputTail: detail.outputTail || String(error.message || '').slice(-2000),
    startup,
    logs,
    reap,
  }, null, 2))
  console.log(JSON.stringify({ case: name, binary, outcome: 'failed', durationMs: error.durationMs, exitCode: detail.exitCode, signal: detail.signal, reap }))
}

async function runCase(name, executable, role, fn) {
  const started = Date.now()
  const binary = `${role}:${path.basename(executable)}`
  const reap = await reapAppImages(executable)
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
    await recordFailure(name, binary, error, handle, reap)
    throw error
  }
  console.log(JSON.stringify({ case: name, binary, outcome, durationMs: Date.now() - started, reap }))
}

async function expectStartup(executable, profile, failure) {
  const handle = start(executable, launchArgs(profile, [`--user-data-dir=${profile.userData}`]), profile)
  const deadline = Date.now() + STARTUP_HOLD_MS
  while (!handle.state.exited && Date.now() < deadline) await delay(100)
  const alive = await stillRunning(handle)
  const trace = await readStartupTrace(profile.dir)
  const crashes = startupCrashEvents(trace)
  const diagnostic = startupDiagnostic(alive, failure, trace)
  if (diagnostic || crashes.length) console.log(JSON.stringify(diagnostic ? { ...diagnostic, ...(crashes.length ? { crashes } : {}) } : { case: failure, alive, startup: trace, crashes }))
  assert.equal(crashes.length, 0, `startup.jsonl recorded ${crashes.join(',')}`)
  if (!alive) throw earlyExit(failure, handle)
  return 'alive'
}

async function expectInspector(executable, profile, prefix, shouldListen) {
  const port = await freePort()
  const handle = start(executable, launchArgs(profile, [`--user-data-dir=${profile.userData}`, `${prefix}=127.0.0.1:${port}`]), profile)
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

// Packaged Electron keeps only --http-parser and --max-http-header-size.
// One inspector connection reads the header size, then the socket is closed
// and the process is stopped. --inspect stays on the parent command line.
const NODE_OPTIONS_READ_MS = 12000

async function readHeaderSizeAt(url) {
  let driver
  try {
    driver = await connectProtocol(url)
    await driver.request('Runtime.enable')
    const result = await driver.request('Runtime.evaluate', {
      expression: HEADER_SIZE_READ,
      awaitPromise: false,
      returnByValue: true,
      includeCommandLineAPI: true,
    })
    const read = headerSizeFromEvaluation(result)
    if (read.description) console.log(read.description)
    return { headerSize: read.headerSize, error: read.error }
  } catch (error) {
    return { headerSize: null, error: String(error.message || error).slice(0, 300) }
  } finally {
    driver?.close()
  }
}

async function expectNodeOptions(executable, profile, shouldApply) {
  const port = await freePort()
  const args = [`--user-data-dir=${profile.userData}`]
  if (shouldApply) args.push(`--inspect=127.0.0.1:${port}`)
  const handle = start(executable, launchArgs(profile, args), profile, {
    NODE_OPTIONS: NODE_OPTIONS_PROBE,
    ELECTRON_ENABLE_LOGGING: '1',
  })
  let headerSize = null
  let readError = null
  const started = Date.now()
  const deadline = started + NODE_OPTIONS_READ_MS
  let elapsedMs = 0
  try {
    if (shouldApply) {
      while (Date.now() < deadline && await stillRunning(handle)) {
        let url = null
        try {
          url = await mainInspectorUrl(port)
        } catch (error) {
          readError = String(error.message || error).slice(0, 300)
          await delay(200)
          continue
        }
        if (!url) { await delay(100); continue }
        const read = await readHeaderSizeAt(url)
        headerSize = read.headerSize
        readError = read.error
        if (headerSize === NODE_OPTIONS_HEADER_SIZE) break
        await delay(200)
      }
    } else {
      while (Date.now() < deadline && await stillRunning(handle) && !String(handle.state.output).includes(NODE_OPTIONS_IGNORED)) await delay(100)
      if (!await stillRunning(handle)) throw earlyExit('NODE_OPTIONS release exited', handle)
    }
  } finally {
    elapsedMs = Date.now() - started
    await stop(handle)
  }
  const outcome = nodeOptionsOutcome({ shouldApply, headerSize: shouldApply ? headerSize : null, output: handle.state.output })
  if (!outcome) {
    const exitCode = handle.state.code
    const signal = handle.state.signal
    throw earlyExit(reportNodeOptionsMiss({
      shouldApply, headerSize, readError, port, exitCode, signal, elapsedMs, timeoutMs: NODE_OPTIONS_READ_MS,
    }), handle)
  }
  return outcome
}

async function expectRunAsNode(executable, profile, shouldRun) {
  const marker = path.join(path.dirname(profile.userData), 'node-marker')
  // No --user-data-dir: Node would treat it as its own flag when the fuse is
  // on. The case directory's HOME and APPDATA are the isolated profile.
  const handle = start(executable, launchArgs(profile, ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`]), profile, { ELECTRON_RUN_AS_NODE: '1' })
  const deadline = Date.now() + 6000
  while (!handle.state.exited && Date.now() < deadline) await delay(100)
  let written = false
  try { written = (await readFile(marker, 'utf8')) === 'ran' } catch { written = false }
  const alive = await stillRunning(handle)
  const outcome = runAsNodeOutcome({ shouldRun, written, alive })
  if (outcome === 'blocked') {
    const trace = await readStartupTrace(profile.dir)
    const crashes = startupCrashEvents(trace)
    if (crashes.length) console.log(JSON.stringify({ case: 'ELECTRON_RUN_AS_NODE', alive, startup: trace, crashes }))
    assert.equal(crashes.length, 0, `startup.jsonl recorded ${crashes.join(',')}`)
  }
  if (!outcome) throw earlyExit(`ELECTRON_RUN_AS_NODE ${shouldRun ? 'did not run' : 'exited before the app stayed up'}`, handle)
  return outcome
}

async function expectSignal(executable, profile, shouldOpen) {
  if (process.platform !== 'darwin') return 'skipped'
  const handle = start(executable, launchArgs(profile, [`--user-data-dir=${profile.userData}`]), profile)
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

await runCase('twin-startup', openExecutable, 'twin', async () => expectStartup(openExecutable, await prepareIsolatedCase(caseDir(), { startupTrace: true }), 'Twin startup failed'))
await runCase('release-startup', releaseExecutable, 'release', async () => expectStartup(releaseExecutable, await prepareIsolatedCase(caseDir(), { startupTrace: true }), 'Release startup failed'))

for (const [executable, open] of [[releaseExecutable, false], [openExecutable, true]]) {
  const role = open ? 'twin' : 'release'
  await runCase('ELECTRON_RUN_AS_NODE', executable, role, async () => expectRunAsNode(executable, await prepareIsolatedCase(caseDir()), open))
  await runCase('NODE_OPTIONS', executable, role, async () => expectNodeOptions(executable, await prepareIsolatedCase(caseDir()), open))
  await runCase('--inspect', executable, role, async () => expectInspector(executable, await prepareIsolatedCase(caseDir()), '--inspect', open))
  await runCase('--inspect-brk', executable, role, async () => expectInspector(executable, await prepareIsolatedCase(caseDir()), '--inspect-brk', open))
  await runCase('SIGUSR1', executable, role, async () => expectSignal(executable, await prepareIsolatedCase(caseDir()), open))
}

console.log(JSON.stringify({
  fuses: 'passed',
  platform: process.platform,
  wire: process.platform === 'darwin' ? 'unsigned-mach-o-fuse-wire' : 'only-fuse-wire',
  negatives: ['release-blocked', 'twin-open'],
}))
