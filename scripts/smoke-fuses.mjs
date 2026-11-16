import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { pathToFuseFile } from '@electron/fuses'
import { smokeEnvironment } from './smoke-driver.mjs'
import {
  assertOnlyFuseWireDiffers,
  assertReleaseFuses,
  readFuseStates,
} from './electron-fuses.mjs'

const releaseExecutable = path.resolve(process.argv[2] ?? '')
const openExecutable = path.resolve(process.argv[3] ?? '')
assert(process.argv[2] && process.argv[3], 'Usage: node scripts/smoke-fuses.mjs <release-executable> <open-fuse-executable>')
assert(['darwin', 'win32'].includes(process.platform), 'Fuse smoke runs on macOS or Windows')

const root = await mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'plancia-fuse-smoke-'))
const marker = path.join(root, 'node-marker')
const hook = path.join(root, 'hook.cjs')
await writeFile(hook, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')\n`)
const env = smokeEnvironment(root)
const userData = path.join(root, 'user-data')

function launch(args, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(releaseExecutable, [`--user-data-dir=${userData}`, ...args], {
      cwd: root,
      env: { ...env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let output = ''
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => { output = (output + chunk.toString()).slice(-4000) })
    }
    const timer = setTimeout(() => finish(true), 4000)
    const finish = (timedOut) => {
      clearTimeout(timer)
      if (process.platform === 'win32' && child.pid) spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
      else child.kill('SIGTERM')
      resolve({ timedOut, output })
    }
    child.once('exit', () => finish(false))
    child.once('error', () => finish(false))
  })
}

async function markerWritten() {
  try {
    return (await readFile(marker, 'utf8')) === 'ran'
  } catch {
    return false
  }
}

async function portRefused(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    const done = (refused) => { socket.destroy(); resolve(refused) }
    socket.setTimeout(500)
    socket.once('connect', () => done(false))
    socket.once('timeout', () => done(true))
    socket.once('error', () => done(true))
  })
}

const releaseStates = await readFuseStates(releaseExecutable)
assertReleaseFuses(releaseStates)
const openFile = await readFile(pathToFuseFile(openExecutable))
const releaseFile = await readFile(pathToFuseFile(releaseExecutable))
if (process.platform === 'darwin') {
  assertReleaseFuses(await readFuseStates(releaseExecutable))
} else {
  assertOnlyFuseWireDiffers(openFile, releaseFile)
}

const nodeMode = await launch(['-e', `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`], { ELECTRON_RUN_AS_NODE: '1' })
assert.equal(await markerWritten(), false, 'ELECTRON_RUN_AS_NODE executed Node in the release binary')
assert.equal(nodeMode.output.includes('ran'), false)
await writeFile(marker, '')

const nodeOptions = await launch([], { NODE_OPTIONS: `--require ${hook}` })
assert.equal(await markerWritten(), false, 'NODE_OPTIONS loaded code in the release binary')
assert.equal(nodeOptions.output.includes('ran'), false)

const inspector = net.createServer()
await new Promise((resolve, reject) => inspector.once('error', reject).listen(0, '127.0.0.1', resolve))
const inspectPort = inspector.address().port
await new Promise((resolve) => inspector.close(resolve))
await launch([`--inspect=127.0.0.1:${inspectPort}`, `--inspect-brk=127.0.0.1:${inspectPort}`])
await delay(300)
assert.equal(await portRefused(inspectPort), true, 'Node inspector listened on the release binary')

let signal = 'skipped'
if (process.platform === 'darwin') {
  const child = spawn(releaseExecutable, [`--user-data-dir=${userData}`], {
    cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stderr.on('data', (chunk) => { output += chunk.toString() })
  child.stdout.on('data', (chunk) => { output += chunk.toString() })
  await delay(1000)
  child.kill('SIGUSR1')
  await delay(1000)
  child.kill('SIGTERM')
  assert.equal(/Debugger listening/i.test(output), false, 'SIGUSR1 opened the Node inspector')
  signal = 'refused'
}

console.log(JSON.stringify({
  fuses: 'passed',
  platform: process.platform,
  wire: process.platform === 'darwin' ? 'states-only-signature-may-differ' : 'only-fuse-wire',
  negatives: ['ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS', '--inspect', '--inspect-brk', signal === 'refused' ? 'SIGUSR1' : 'SIGUSR1-not-this-platform'],
}))
