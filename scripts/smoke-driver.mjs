import assert from 'node:assert/strict'
import path from 'node:path'

export function smokeEnvironment(root, source = process.env, platform = process.platform) {
  const env = Object.fromEntries(Object.entries(source).filter(([key]) =>
    /^(PATH|SystemRoot|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|TMPDIR|LANG|LC_ALL|DISPLAY|XAUTHORITY|__CF_USER_TEXT_ENCODING)$/i.test(key)))
  Object.assign(env, {
    HOME: path.join(root, 'home'), USERPROFILE: path.join(root, 'home'),
    APPDATA: path.join(root, 'app-data'), LOCALAPPDATA: path.join(root, 'local-app-data'),
    XDG_CONFIG_HOME: path.join(root, 'config'), XDG_DATA_HOME: path.join(root, 'data'), XDG_CACHE_HOME: path.join(root, 'cache'),
    ZDOTDIR: path.join(root, 'shell'), PLANCIA_SMOKE_VALUE: 'OK',
  })
  if (platform !== 'win32') env.SHELL = '/bin/zsh'
  return env
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

export async function isolateBeforeMain({ diagnostics, until, root }) {
  const url = await until(() => diagnostics().match(/Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/)?.[1], 'Main debugger did not start')
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
