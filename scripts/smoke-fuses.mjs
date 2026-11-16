import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
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
import { smokeEnvironment } from './smoke-driver.mjs'

const releaseExecutable = path.resolve(process.argv[2] ?? '')
const openExecutable = path.resolve(process.argv[3] ?? '')
assert(process.argv[2] && process.argv[3], 'Usage: node scripts/smoke-fuses.mjs <release-executable> <open-fuse-executable>')
assert(['darwin', 'win32'].includes(process.platform), 'Fuse smoke runs on macOS or Windows')

const root = await mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'plancia-fuse-smoke-'))
const env = smokeEnvironment(root)
let profile = 0

function dataDir() {
  profile += 1
  return path.join(root, `user-data-${profile}`)
}

function start(executable, args, extraEnv = {}) {
  const child = spawn(executable, args, {
    cwd: root,
    env: { ...env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  const state = { output: '', code: null, signal: null, exited: false }
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => { state.output = (state.output + chunk.toString()).slice(-4000) })
  }
  child.once('exit', (code, signal) => { state.exited = true; state.code = code; state.signal = signal })
  child.once('error', () => { state.exited = true })
  return { child, state }
}

async function stop(handle) {
  if (handle.state.exited) return
  if (process.platform === 'win32' && handle.child.pid) {
    await new Promise((resolve) => {
      const killer = spawn('taskkill.exe', ['/pid', String(handle.child.pid), '/t', '/f'], { stdio: 'ignore' })
      killer.once('exit', resolve)
      killer.once('error', resolve)
    })
  } else handle.child.kill('SIGTERM')
  const deadline = Date.now() + 8000
  while (!handle.state.exited && Date.now() < deadline) await delay(100)
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

async function expectInspector(executable, prefix, shouldListen) {
  const port = await freePort()
  const handle = start(executable, [`--user-data-dir=${dataDir()}`, `${prefix}=127.0.0.1:${port}`])
  await delay(800)
  assert.equal(handle.state.exited, false, `${prefix} process exited before the port check (${handle.state.signal})`)
  let seen = false
  const deadline = Date.now() + 8000
  while (!handle.state.exited && Date.now() < deadline) {
    if (await portOpen(port)) { seen = true; break }
    await delay(200)
  }
  await stop(handle)
  assert.equal(seen, shouldListen, `${prefix} listener ${shouldListen ? 'missing' : 'unexpected'}`)
}

async function expectNodeOptions(executable, shouldListen) {
  const port = await freePort()
  const handle = start(executable, [`--user-data-dir=${dataDir()}`], { NODE_OPTIONS: `--inspect=127.0.0.1:${port}` })
  await delay(800)
  assert.equal(handle.state.exited, false, `NODE_OPTIONS process exited before the port check (${handle.state.signal})`)
  let seen = false
  const deadline = Date.now() + 8000
  while (!handle.state.exited && Date.now() < deadline) {
    if (await portOpen(port)) { seen = true; break }
    await delay(200)
  }
  await stop(handle)
  assert.equal(seen, shouldListen, `NODE_OPTIONS --inspect ${shouldListen ? 'missing' : 'unexpected'}`)
}

async function expectRunAsNode(executable, shouldRun) {
  profile += 1
  const marker = path.join(root, `node-marker-${profile}`)
  const handle = start(executable, ['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`], { ELECTRON_RUN_AS_NODE: '1' })
  const deadline = Date.now() + 6000
  while (!handle.state.exited && Date.now() < deadline) await delay(100)
  let written = false
  try { written = (await readFile(marker, 'utf8')) === 'ran' } catch { written = false }
  await stop(handle)
  assert.equal(written, shouldRun, `ELECTRON_RUN_AS_NODE ${shouldRun ? 'did not run' : 'ran'}`)
}

async function expectSignal(executable, shouldOpen) {
  if (process.platform !== 'darwin') return 'skipped'
  const handle = start(executable, [`--user-data-dir=${dataDir()}`])
  await delay(1000)
  assert.equal(handle.state.exited, false, `App exited before SIGUSR1 (${handle.state.signal})`)
  handle.child.kill('SIGUSR1')
  const deadline = Date.now() + 3000
  while (!handle.state.exited && Date.now() < deadline && !/Debugger listening/i.test(handle.state.output)) await delay(100)
  const opened = /Debugger listening/i.test(handle.state.output)
  await stop(handle)
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
  await expectRunAsNode(executable, open)
  await expectNodeOptions(executable, open)
  await expectInspector(executable, '--inspect', open)
  await expectInspector(executable, '--inspect-brk', open)
  await expectSignal(executable, open)
}

console.log(JSON.stringify({
  fuses: 'passed',
  platform: process.platform,
  wire: process.platform === 'darwin' ? 'unsigned-mach-o-fuse-wire' : 'only-fuse-wire',
  negatives: ['release-blocked', 'twin-open'],
}))
