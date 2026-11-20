import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { connectProtocol, prepareIsolatedSmokeRoot } from './smoke-driver.mjs'

// External fixture only: CSS/interaction regression does not prove native movement.
// --interactive keeps the isolated window open for physical/native input testing;
// the fixture records BrowserWindow move/resize/lifecycle events in native-window.json.
const args = process.argv.slice(2)
const interactive = args.includes('--interactive')
assert(args.every(arg => !arg.startsWith('--') || arg === '--interactive'), 'Unknown option')
const positional = args.filter(arg => arg !== '--interactive')
assert(positional.length <= 2, 'Usage: node scripts/smoke-window-chrome.mjs [built-project] [renderer-or-app.asar] [--interactive]')
const project = path.resolve(positional[0] ?? '.')
const rendererPath = path.resolve(positional[1] ?? project)
const root = await mkdtemp(path.join(os.tmpdir(), 'plancia-window-chrome-'))
const { env } = await prepareIsolatedSmokeRoot(root)
const server = net.createServer()
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
await new Promise(resolve => server.close(resolve))
const executable = path.join(project, 'node_modules/electron/dist', process.platform === 'win32' ? 'electron.exe' : 'Electron.app/Contents/MacOS/Electron')
const fixture = fileURLToPath(new URL('./fixtures/terminal-stream-main.cjs', import.meta.url))
const child = spawn(executable, [fixture, rendererPath, root, String(port), '5', interactive ? 'window-chrome' : 'window-chrome-hidden'], {
  cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], timeout: interactive ? 20 * 60 * 1000 : 120000,
})
let exited = false
child.once('exit', () => { exited = true })
let diagnostic = ''
for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { diagnostic = (diagnostic + chunk).slice(-4000) })
async function until(task, label) {
  for (let attempt = 0; attempt < 150; attempt++) {
    assert(!exited, label + ': fixture exited: ' + diagnostic)
    const result = await task()
    if (result) return result
    await delay(100)
  }
  throw new Error('Timed out: ' + label)
}
let driver
const results = []
try {
  const page = await until(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })
      return (await response.json()).find(page => page.type === 'page' && page.url.startsWith('file:'))
    } catch { return null }
  }, 'renderer')
  driver = await connectProtocol(page.webSocketDebuggerUrl)
  const evaluate = driver.evaluate
  await until(() => evaluate('Boolean(document.querySelector(".app"))'), 'workspace')
  const settle = () => evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
  for (const locale of ['it', 'en']) for (const theme of ['light', 'dark']) {
    await evaluate(`plancia.updateSettings(${JSON.stringify({ locale, theme })})`)
    await settle()
    for (const width of [860, 1280]) {
      await driver.request('Emulation.setDeviceMetricsOverride', { width, height: 820, deviceScaleFactor: 1, mobile: false })
      await settle()
      const regions = await evaluate(`(() => {
        const region = element => getComputedStyle(element).webkitAppRegion;
        const toolbar = document.querySelector('.toolbar');
        const group = toolbar.querySelector('.segmented');
        return { platform: document.documentElement.dataset.platform, toolbar: region(toolbar),
          title: region(toolbar.querySelector('.toolbar-title')), group: region(group),
          buttons: [...toolbar.querySelectorAll('button')].map(region),
          terminals: [...document.querySelectorAll('.term-host')].map(region),
          sessions: [...document.querySelectorAll('.session')].map(region) };
      })()`)
      assert.equal(regions.platform, process.platform)
      assert.equal(regions.toolbar, process.platform === 'darwin' ? 'drag' : 'none')
      if (process.platform === 'darwin') {
        assert.equal(regions.title, 'drag')
        assert.equal(regions.group, 'no-drag')
      }
      assert(regions.buttons.every(region => region === 'no-drag'))
      assert(regions.terminals.every(region => region !== 'drag'))
      assert(regions.sessions.every(region => region !== 'drag'))
      // Check logical controls as well; native pointer exclusion is checked separately.
      await evaluate('document.querySelector("[data-testid=layout-split]").click()')
      await settle()
      assert.equal(await evaluate('document.querySelector(".tiles").dataset.layout'), 'split')
      await evaluate('document.querySelector("[data-testid=layout-single]").click()')
      await settle()
      // The narrow sidebar is offscreen until opened; use its actual UI toggle.
      if (width === 860) await evaluate('Boolean(document.querySelector(".sidebar-slot.is-open")) || document.querySelector(".menu-btn").click()')
      await evaluate('document.querySelector("[data-testid=open-settings]").click()')
      await settle()
      if (process.platform === 'darwin') assert.equal(await evaluate('getComputedStyle(document.querySelector(".overlay")).webkitAppRegion'), 'no-drag')
      const themeIndex = theme === 'light' ? 2 : 1
      await evaluate(`document.querySelectorAll('.dialog-settings [role=radio]')[${themeIndex}].click()`)
      await settle()
      assert.equal(await evaluate(`document.querySelectorAll('.dialog-settings [role=radio]')[${themeIndex}].getAttribute('aria-checked')`), 'true')
      await evaluate('document.querySelector(".overlay").dispatchEvent(new MouseEvent("mousedown", {bubbles:true}))')
      await settle()
      assert.equal(await evaluate('document.querySelector(".overlay")'), null)
      await evaluate(`plancia.updateSettings(${JSON.stringify({ theme })})`)
      results.push({ locale, theme, width, regions, controls: 'passed', nativeMovement: 'requires native input' })
    }
  }
  await driver.request('Emulation.clearDeviceMetricsOverride')
  await writeFile(path.join(root, 'report.json'), JSON.stringify({ platform: process.platform, results }, null, 2))
  console.log(JSON.stringify({ smoke: 'window-chrome-passed', platform: process.platform, root, scenarios: results.length, nativeMovement: 'not established by DOM checks' }))
  if (interactive) {
    console.log(JSON.stringify({ interactive: true, root, port, pid: child.pid, note: 'Use native input; native-window.json records actual bounds.' }))
    while (!exited) await delay(250)
  }
} catch (error) {
  if (driver) {
    const shot = await driver.request('Page.captureScreenshot').catch(() => null)
    if (shot) await writeFile(path.join(root, 'failure.png'), Buffer.from(shot.data, 'base64'))
  }
  await writeFile(path.join(root, 'report.json'), JSON.stringify({ error: String(error), results }, null, 2))
  console.error('Window chrome evidence: ' + root)
  throw error
} finally {
  driver?.close()
  if (!exited) child.kill()
}
