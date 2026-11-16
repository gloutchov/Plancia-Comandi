import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { restoreSmokeWorkerStartup } from './smoke-worker.mjs'

export function parseListenAddresses(text) {
  const found = []
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('LocalAddress') || line.startsWith('COMMAND')) continue
    if (/^(?:\*|0\.0\.0\.0|::|\[::\]|\d+\.\d+\.\d+\.\d+)$/.test(line)) found.push(line.replace(/^\[|\]$/g, ''))
    const match = line.match(/(\*|0\.0\.0\.0|\[::\]|::|\d+\.\d+\.\d+\.\d+):\d+\s+\(LISTEN\)/i)
    if (match) found.push(match[1].replace(/^\[|\]$/g, ''))
  }
  return found
}

export function listenAddressEscapesLoopback(address) {
  return address === '*' || address === '0.0.0.0' || address === '::'
}

export async function assertLoopbackListener(port) {
  assert.equal(await canConnect(port, '127.0.0.1'), true, 'Debugging did not accept 127.0.0.1')
  const other = Object.values(os.networkInterfaces()).flat().find(entry => entry && entry.family === 'IPv4' && !entry.internal)
  if (!other) return { nonLoopback: 'absent' }
  assert.equal(await canConnect(port, other.address), false, 'Debugging accepted a non-loopback address')
  return { nonLoopback: other.address, refused: true }
}

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host })
    const done = (value) => { socket.removeAllListeners(); socket.destroy(); resolve(value) }
    socket.setTimeout(500)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

const DROPPED_ENV = /^(NODE_OPTIONS|ELECTRON_RUN_AS_NODE|PLANCIA_DEMO|MOLO_DEMO|VITE_DEV_SERVER_URL)$/i
const SECRET_ENV = /(SECRET|TOKEN|PASSWORD|CREDENTIAL|API_KEY)/i

/** HOMEDRIVE and HOMEPATH for an isolated Windows USERPROFILE, when the path has a drive. */
export function windowsProfileVars(home) {
  const match = home.replaceAll('/', '\\').match(/^([A-Za-z]:)(\\.*)$/)
  if (!match) return null
  return { HOMEDRIVE: match[1], HOMEPATH: match[2] }
}

export function smokeEnvironment(root, source = process.env, platform = process.platform) {
  const env = {}
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== 'string' || DROPPED_ENV.test(key) || SECRET_ENV.test(key)) continue
    env[key] = value
  }
  const home = path.join(root, 'home')
  Object.assign(env, {
    HOME: home, USERPROFILE: home,
    APPDATA: path.join(root, 'app-data'), LOCALAPPDATA: path.join(root, 'local-app-data'),
    XDG_CONFIG_HOME: path.join(root, 'config'), XDG_DATA_HOME: path.join(root, 'data'), XDG_CACHE_HOME: path.join(root, 'cache'),
    ZDOTDIR: path.join(root, 'shell'), PLANCIA_SMOKE_VALUE: 'OK',
  })
  if (platform === 'win32') {
    const profile = windowsProfileVars(home)
    if (profile) Object.assign(env, profile)
  } else env.SHELL = '/bin/zsh'
  return env
}

const ISOLATED_DIRS = ['shell', 'home', 'app-data', 'local-app-data', 'session-data', 'config', 'data', 'cache']

export function isolatedSmokeSettings(root) {
  return {
    locale: 'en', theme: 'light', layout: 'single', fontSize: 13,
    notifyDesktop: false, notifyBadge: false, lastCwd: root,
  }
}

/** Directories, settings and environment shared by the package smoke and the fuse launches. */
export async function prepareIsolatedSmokeRoot(root, source = process.env, platform = process.platform) {
  const userData = path.join(root, 'user-data')
  await mkdir(userData, { recursive: true })
  for (const dir of ISOLATED_DIRS) await mkdir(path.join(root, dir), { recursive: true })
  const env = smokeEnvironment(root, source, platform)
  if (platform === 'win32') {
    await mkdir(path.join(env.USERPROFILE, 'AppData', 'Roaming'), { recursive: true })
    await mkdir(path.join(env.USERPROFILE, 'AppData', 'Local'), { recursive: true })
  }
  const settings = isolatedSmokeSettings(root)
  await writeFile(path.join(userData, 'settings.json'), JSON.stringify(settings))
  return { root, userData, env, settings }
}

/** Local inspector/CDP transport; never shipped as an application API. */
export async function connectProtocol(url, onEvent = () => {}) {
  assert(url.startsWith('ws://127.0.0.1:'), 'Debugging must stay on loopback')
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  const pending = new Map()
  let sequence = 0
  socket.addEventListener('message', ({ data }) => {
    const reply = JSON.parse(data)
    if (reply.method) onEvent(reply.method, reply.params)
    const item = pending.get(reply.id)
    if (!item) return
    pending.delete(reply.id)
    clearTimeout(item.timer)
    if (reply.error) item.reject(new Error(reply.error.message))
    else item.resolve(reply.result)
  })
  socket.addEventListener('close', () => {
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('Debugging connection closed')) }
    pending.clear()
  })
  function request(method, params = {}) {
    const id = ++sequence
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)) }, 10000)
      pending.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }
  async function evaluate(expression, awaitPromise = true) {
    const result = await request('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })
    assert(!result.exceptionDetails, 'Runtime evaluation failed: ' + JSON.stringify(result.exceptionDetails))
    return result.result?.value
  }
  return { request, evaluate, close: () => socket.close() }
}

/** Launchers such as NSIS need not forward the inner process's stderr. */
export async function mainInspectorUrl(port) {
  assert(Number.isInteger(port) && port > 0 && port < 65536, 'Invalid loopback inspector port')
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })
    const entries = await response.json()
    if (!Array.isArray(entries)) return null
    const url = entries.find(entry => entry.type === 'node')?.webSocketDebuggerUrl
    return typeof url === 'string' && url.startsWith(`ws://127.0.0.1:${port}/`) ? url : null
  } catch { return null }
}

export async function isolateBeforeMain({ diagnostics, until, root, inspectorPort }) {
  const url = await until(() => inspectorPort === undefined
    ? diagnostics().match(/Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/)?.[1]
    : mainInspectorUrl(inspectorPort), 'Main debugger did not start')
  const scripts = new Map()
  let paused
  const driver = await connectProtocol(url, (method, params) => {
    if (method === 'Debugger.scriptParsed') scripts.set(params.scriptId, params.url)
    if (method === 'Debugger.paused') paused = params
  })
  const mainUrl = () => scripts.get(paused?.callFrames[0].location.scriptId) ?? paused?.callFrames[0].url ?? ''
  try {
    await driver.request('Debugger.enable')
    const breakpoint = await driver.request('Debugger.setBreakpointByUrl', { lineNumber: 0, urlRegex: 'app\\.asar[/\\\\]dist-electron[/\\\\]main\\.js$' })
    await driver.request('Runtime.runIfWaitingForDebugger')
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await until(() => paused, 'Main entry did not pause', 10000)
      if (/app\.asar[/\\]dist-electron[/\\]main\.js$/.test(mainUrl())) break
      paused = undefined
      await driver.request('Debugger.resume')
    }
    assert(paused && /app\.asar[/\\]dist-electron[/\\]main\.js$/.test(mainUrl()), 'Application main was not paused before startup')
    const expected = Object.fromEntries(['home', 'appData', 'userData', 'sessionData'].map((key, i) => [key, path.join(root, ['home', 'app-data', 'user-data', 'session-data'][i])]))
    const actual = await driver.evaluate(`(() => {
      globalThis.__smokeElectron = process.getBuiltinModule('module').createRequire(process.resourcesPath + '/app.asar/package.json')('electron');
      const app = __smokeElectron.app;
      const paths = ${JSON.stringify(expected)};
      for (const [key, value] of Object.entries(paths)) app.setPath(key, value);
      return Object.fromEntries(Object.keys(paths).map(key => [key, app.getPath(key)]));
    })()`, false)
    assert.deepEqual(actual, expected)
    await driver.evaluate(`(${restoreSmokeWorkerStartup.toString()})()`, false)
    // The caller may install synthetic-only probes while startup is paused.
    return { ...driver, resume: async () => {
      await driver.request('Debugger.removeBreakpoint', { breakpointId: breakpoint.breakpointId })
      await driver.request('Debugger.resume')
      // Early startup isolation is finished. Keep Runtime available for later
      // probes, without leaving the main process's Debugger agent enabled.
      await driver.request('Debugger.disable')
    } }
  } catch (error) { driver.close(); throw error }
}
