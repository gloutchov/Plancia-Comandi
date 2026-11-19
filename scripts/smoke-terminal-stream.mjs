import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { connectProtocol, prepareIsolatedSmokeRoot } from './smoke-driver.mjs'

// External Electron fixture: production renderer, synthetic bridge, no shell,
// personal profile, real clipboard, AI CLI or product test hook.
const project = path.resolve(process.argv[2] ?? '.')
const root = await mkdtemp(path.join(os.tmpdir(), 'plancia-terminal-stream-'))
const { env } = await prepareIsolatedSmokeRoot(root)
const server = net.createServer()
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
await new Promise(resolve => server.close(resolve))
const electron = path.join(project, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron.app/Contents/MacOS/Electron')
const fixture = fileURLToPath(new URL('./fixtures/terminal-stream-main.cjs', import.meta.url))
const child = spawn(electron, [fixture, project, root, String(port)], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
let exited = false
let diagnostic = ''
let code
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { diagnostic = (diagnostic + data).slice(-4000) })
child.once('exit', value => { exited = true; code = value })
let driver
async function until(task, label) {
  for (let i = 0; i < 150; i++) {
    assert(!exited, `Fixture exited (${code}): ${label}: ${diagnostic}`)
    const result = await task()
    if (result) return result
    await delay(100)
  }
  throw new Error('Timed out: ' + label)
}
try {
  const page = await until(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      return (await response.json()).find(p => p.type === 'page' && p.url.startsWith('file:'))
    } catch { return null }
  }, 'renderer')
  driver = await connectProtocol(page.webSocketDebuggerUrl)
  const evaluate = driver.evaluate
  const report = () => evaluate('terminalProbe.report()')
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  await until(() => evaluate('document.querySelector(".xterm")'), 'terminal')
  await until(async () => (await report()).writes.length >= 3, 'initial DA/OSC replies')
  await until(async () => (await report()).subscriptions.length === 3, 'all session streams')
  assert((await report()).resizes.every(r => r.id.endsWith('1')), 'Hidden panes resized a PTY')
  const id = '00000000-0000-4000-8000-000000000001'
  await evaluate('globalThis.originalTerminal = document.querySelector(".xterm")')
  await click('.session:nth-child(2)')
  await until(() => evaluate('document.querySelector(".tile-bar strong").textContent === "Synthetic 2"'), 'second session')
  await delay(250)
  await click('.session:nth-child(1)')
  await until(() => evaluate('document.querySelector(".tile-bar strong").textContent === "Synthetic 1"'), 'first session')
  await delay(250)
  const switched = await report()
  const subscribes = switched.subscriptions.filter(value => value === id).length
  const replies = switched.writes.filter(value => value.id === id).length
  console.log(JSON.stringify({ scenario: 'hide-and-return', subscriptions: subscribes, replies }))
  assert.equal(subscribes, 1, 'Returning to a session must not replay its protocol queries')
  assert.equal(replies, 3, 'Historical DA/OSC queries must not produce duplicate replies')
  assert(await evaluate('originalTerminal === document.querySelector(".xterm")'), 'Terminal instance changed')
  for (const mode of ['split', 'stack', 'grid', 'single']) {
    await click(`[data-testid="layout-${mode}"]`)
    await until(() => evaluate(`document.querySelector('.tiles').dataset.layout === ${JSON.stringify(mode)}`), mode)
    await delay(100)
  }
  assert.equal((await report()).subscriptions.length, 3)
  await click('.session:nth-child(2)')
  for (const data of ['\x1b[', 'c\x1b]10;', '?\x07\x1b]11;?', '\x1b\\']) {
    await evaluate(`terminalProbe.emit(${JSON.stringify(id)}, ${JSON.stringify(data)})`)
  }
  await until(async () => (await report()).writes.filter(value => value.id === id).length === 6, 'hidden terminal replies')
  await click('.session:nth-child(1)')
  let expectedReplies = 6
  for (const locale of ['it', 'en']) for (const theme of ['light', 'dark']) {
    await evaluate(`plancia.updateSettings(${JSON.stringify({ locale, theme })})`)
    await until(() => evaluate(`document.documentElement.lang === '${locale}' && document.documentElement.dataset.theme === '${theme}'`), 'theme/locale')
    await evaluate(`terminalProbe.emit(${JSON.stringify(id)}, '\\x1b]10;?\\x07\\x1b]11;?\\x07')`)
    expectedReplies += 2
    await until(async () => (await report()).writes.filter(w => w.id === id).length === expectedReplies, 'theme replies')
    const colors = (await report()).writes.filter(w => w.id === id).slice(-2).map(w => w.data)
    assert.deepEqual(colors, theme === 'dark'
      ? ['\x1b]10;rgb:e7e7/e2e2/d6d6\x1b\\', '\x1b]11;rgb:1414/1818/2020\x1b\\']
      : ['\x1b]10;rgb:1d1d/1b1b/1616\x1b\\', '\x1b]11;rgb:fbfb/fafa/f6f6\x1b\\'])
    for (const [width, height] of [[1440, 900], [1280, 820], [860, 560]]) {
      await driver.request('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
      await delay(100)
      assert.equal(await evaluate('document.querySelectorAll(".tile:not([hidden])").length'), 1)
      const shot = await driver.request('Page.captureScreenshot')
      await writeFile(path.join(root, `${locale}-${theme}-${width}.png`), Buffer.from(shot.data, 'base64'))
    }
  }
  await driver.request('Input.insertText', { text: 'synthetic input' })
  await driver.request('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  await driver.request('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  await until(async () => (await report()).writes.some(w => w.data === 'synthetic input'), 'user input')
  assert((await report()).writes.some(w => w.data === '\x1b[A'), 'Arrow key was lost')
  await driver.request('Input.dispatchKeyEvent', { type: 'keyDown', key: 'v', code: 'KeyV', modifiers: process.platform === 'darwin' ? 4 : 10, windowsVirtualKeyCode: 86 })
  await driver.request('Input.dispatchKeyEvent', { type: 'keyUp', key: 'v', code: 'KeyV', windowsVirtualKeyCode: 86 })
  await until(async () => (await report()).writes.some(w => w.data === 'synthetic paste'), 'paste')
  await evaluate(`terminalProbe.remove(${JSON.stringify(id)})`)
  await until(() => evaluate('document.querySelectorAll(".xterm").length === 2'), 'session disposal')
  console.log(JSON.stringify({ smoke: 'terminal-stream-passed', platform: process.platform, root, checks: ['DA/OSC', 'hidden sessions', 'four layouts', 'fragmented output', 'IT/EN', 'theme colors', 'three desktop sizes', 'input', 'arrows', 'paste', 'disposal'] }))
} finally {
  driver?.close()
  child.kill()
}
