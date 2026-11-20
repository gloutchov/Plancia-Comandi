import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { connectProtocol, prepareIsolatedSmokeRoot } from './smoke-driver.mjs'

const project = path.resolve(process.argv[2] ?? '.')
// Optional packaged app.asar: test the exact distributed renderer with the same fixture.
const renderer = path.resolve(process.argv[3] ?? project)
const root = await mkdtemp(path.join(os.tmpdir(), 'plancia-terminal-geometry-'))
const { env } = await prepareIsolatedSmokeRoot(root)
const server = net.createServer()
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
await new Promise(resolve => server.close(resolve))
const electron = path.join(project, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron.app/Contents/MacOS/Electron')
const fixture = fileURLToPath(new URL('./fixtures/terminal-stream-main.cjs', import.meta.url))
const child = spawn(electron, [fixture, renderer, root, String(port), '5'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, timeout: 120000 })
let exited = false
let diagnostic = ''
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { diagnostic = (diagnostic + data).slice(-4000) })
child.once('exit', () => { exited = true })
let driver
async function until(task, label) {
  for (let i = 0; i < 150; i++) {
    assert(!exited, `Fixture exited: ${label}: ${diagnostic}`)
    const result = await task()
    if (result) return result
    await delay(100)
  }
  throw new Error('Timed out: ' + label)
}
const results = []
try {
  const page = await until(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })
      return (await response.json()).find(p => p.type === 'page' && p.url.startsWith('file:'))
    } catch { return null }
  }, 'renderer')
  driver = await connectProtocol(page.webSocketDebuggerUrl)
  const evaluate = driver.evaluate
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const settle = async () => {
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    await delay(100)
  }
  const metrics = () => evaluate(`(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
    return [...document.querySelectorAll('.tile:not([hidden]) .xterm')].map(term => {
      const viewport = term.querySelector('.xterm-viewport');
      const rows = term.querySelector('.xterm-rows');
      const cursor = term.querySelector('.xterm-cursor');
      return { screen:rect(term.querySelector('.xterm-screen')), viewport:rect(viewport), cursor:cursor && rect(cursor), rows:rows.children.length,
        clientWidth:viewport.clientWidth, clientHeight:viewport.clientHeight, scrollHeight:viewport.scrollHeight, scrollTop:viewport.scrollTop,
        first:rows.firstElementChild.textContent, last:rows.lastElementChild.textContent,
        sample:[...rows.children].map(row => row.textContent).filter(text => text.startsWith('ROW ')).join('\\n') };
    });
  })()`)
  const checkGeometry = async label => {
    const panes = await metrics()
    assert(panes.length > 0, label + ': no visible terminals')
    for (const pane of panes) {
      assert(pane.screen.width > 0 && pane.screen.height > 0, label + ': empty screen')
      assert(pane.screen.right <= pane.viewport.x + pane.clientWidth + 0.5, label + ': cells overlap scrollbar')
      assert(pane.screen.bottom <= pane.viewport.y + pane.clientHeight + 0.5, label + ': last row clipped')
      if (pane.cursor) assert(pane.cursor.right <= pane.viewport.x + pane.clientWidth + 0.5, label + ': cursor overlaps scrollbar')
    }
    results.push({ label, panes })
    return panes[0]
  }
  const screenshot = async name => {
    const shot = await driver.request('Page.captureScreenshot')
    await writeFile(path.join(root, name + '.png'), Buffer.from(shot.data, 'base64'))
  }
  const scroll = async (label, insetOverride) => {
    await evaluate("document.querySelector('.tile:not([hidden]) .xterm-viewport').scrollTop = 1e9")
    await settle()
    const before = (await metrics())[0]
    assert(before.scrollTop > before.clientHeight, label + ': no history')
    await driver.request('Input.dispatchMouseEvent', { type: 'mouseMoved', x: before.viewport.x + 50, y: before.viewport.y + 50 })
    await driver.request('Input.dispatchMouseEvent', { type: 'mouseWheel', x: before.viewport.x + 50, y: before.viewport.y + 50, deltaX: 0, deltaY: -200 })
    await settle()
    const after = (await metrics())[0]
    results.push({ label: label + '-wheel', before, after })
    assert(after.scrollTop < before.scrollTop && after.sample !== before.sample, label + ': wheel did not move displayed history')
    const barWidth = before.viewport.width - before.clientWidth
    if (barWidth > 0) {
      await evaluate("document.querySelector('.tile:not([hidden]) .xterm-viewport').scrollTop = 1e9")
      await settle()
      const x = before.viewport.right - barWidth / 2
      // Windows reserves the ends of the native track for arrow buttons.
      // The viewport's full height is not the draggable track's height.
      const trackInset = insetOverride ?? (process.platform === 'win32' ? barWidth : 0)
      const trackHeight = before.clientHeight - 2 * trackInset
      const thumbHeight = Math.max(20, trackHeight * before.clientHeight / before.scrollHeight)
      const y = before.viewport.bottom - trackInset - thumbHeight / 2
      const targetY = before.viewport.y + before.clientHeight / 2
      await driver.request('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
      await driver.request('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
      await settle()
      const pressed = (await metrics())[0]
      await driver.request('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: targetY, button: 'left', buttons: 1 })
      await settle()
      await driver.request('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y: targetY, button: 'left', clickCount: 1 })
      await settle()
      const dragged = (await metrics())[0]
      results.push({ label: label + '-drag', barWidth, trackInset, thumbHeight, x, y, targetY,
        beforeTop: before.scrollTop, pressedTop: pressed.scrollTop, draggedTop: dragged.scrollTop })
      assert(Math.abs(pressed.scrollTop - before.scrollTop) < 1, label + ': press paged the track instead of grabbing the thumb')
      assert(dragged.scrollTop < before.scrollTop - 100 && dragged.sample !== before.sample, label + ': dragging the thumb did not move displayed history')
    }
    results.push({ label: label + '-scroll', wheel: true, thumb: barWidth > 0 ? 'passed' : 'overlay-without-persistent-thumb' })
  }
  const ids = [1, 2, 3, 4, 5].map(i => `00000000-0000-4000-8000-00000000000${i}`)
  const emit = (id, data) => evaluate(`terminalProbe.emit(${JSON.stringify(id)}, ${JSON.stringify(data)})`)
  await until(() => evaluate('document.querySelector(".xterm-rows")?.children.length > 0'), 'terminal')
  await until(async () => (await evaluate('terminalProbe.report()')).subscriptions.length === ids.length, 'subscriptions')
  await settle()
  const empty = (await metrics())[0]
  assert(empty.scrollHeight - empty.clientHeight < 2, 'Empty normal buffer gained artificial history')
  const output = Array.from({ length: 200 }, (_, i) => `ROW ${i} \x1b[32m${'Ab界é'.repeat(55)}\x1b[0m\r\n`).join('')
  for (const id of ids) await emit(id, output)
  await settle()
  // Verify a fresh alternate screen before resizing, then restore normal history.
  await emit(ids[0], '\x1b[?1049h\x1b[2J\x1b[H' + output)
  await settle()
  const freshAlternate = (await metrics())[0]
  assert(freshAlternate.scrollHeight - freshAlternate.clientHeight < 2, 'Fresh alternate buffer gained history')
  await emit(ids[0], '\x1b[?1049l')
  await settle()
  await screenshot('initial-single')
  await checkGeometry('initial-single')
  await scroll('initial-single')
  // Reproduce end controls on macOS too, keeping the measured scrollbar width.
  const insetBarWidth = (await metrics())[0].viewport.width - (await metrics())[0].clientWidth
  await evaluate(`globalThis.insetStyle = document.createElement('style'); insetStyle.textContent =
    '.xterm-viewport::-webkit-scrollbar { width: ${insetBarWidth}px; } .xterm-viewport::-webkit-scrollbar-track { margin-block: 22px; } .xterm-viewport::-webkit-scrollbar-thumb { background: #888; }'; document.head.append(insetStyle)`)
  await settle()
  await checkGeometry('emulated-inset-scrollbar')
  await scroll('emulated-inset-scrollbar', 22)
  await screenshot('inset-scrollbar')
  await evaluate('insetStyle.remove()')
  // A hidden terminal must not publish a zero-size PTY, including during font changes.
  await evaluate('globalThis.originalTerminals = [...document.querySelectorAll(".xterm")]')
  const prior = await evaluate('terminalProbe.report()')
  assert(prior.resizes.every(r => r.id === ids[0]), 'Hidden terminal was resized')
  await evaluate('plancia.updateSettings({fontSize: 20})')
  await settle()
  assert((await evaluate('terminalProbe.report()')).resizes.slice(prior.resizes.length).every(r => r.id === ids[0]))
  await click('.session:nth-child(2)')
  await settle()
  await checkGeometry('previously-hidden-font-change')
  await scroll('previously-hidden-font-change')
  await click('.session:nth-child(1)')
  const modes = ['single', 'split', 'stack', 'grid']
  for (const mode of modes) {
    await click(`[data-testid="layout-${mode}"]`)
    await settle()
    await checkGeometry(mode)
    await scroll(mode)
  }
  const panePositions = () => evaluate(`Array.from(document.querySelectorAll('.tile:not([hidden])[data-session-id]'), tile => {
    const r = tile.getBoundingClientRect();
    return { id: tile.dataset.sessionId, x: r.x, y: r.y, width: r.width, height: r.height,
      headerY: tile.querySelector('.tile-bar').getBoundingClientRect().y,
      screenY: tile.querySelector('.xterm-screen').getBoundingClientRect().y, scrollTop: tile.scrollTop };
  })`)
  for (const locale of ['it', 'en']) for (const theme of ['light', 'dark']) {
    await evaluate(`plancia.updateSettings(${JSON.stringify({ locale, theme })})`)
    for (const mode of ['split', 'stack', 'grid']) {
      await click('[data-testid="layout-single"]')
      await click('.session:nth-child(1)')
      await click(`[data-testid="layout-${mode}"]`)
      await settle()
      const before = await panePositions()
      const target = before.at(-1)
      const priorResizes = (await evaluate('terminalProbe.report()')).resizes.length
      // Native mouse input inside the last pane must change focus, not its slot.
      const x = target.x + 30
      const y = target.y + 60
      await driver.request('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
      await driver.request('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
      await settle()
      assert.deepEqual(await panePositions(), before, 'Focusing a pane changed its position or the visible group')
      assert.equal(await evaluate('document.querySelector(".tile.is-active").dataset.sessionId'), target.id)
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".tile.is-active")).outlineWidth'), '2px')
      assert.equal((await evaluate('terminalProbe.report()')).resizes.length, priorResizes, 'Active border resized a PTY')
      if (mode === 'split') {
        await click('[data-testid="layout-stack"]')
        await settle()
        assert.deepEqual((await panePositions()).map(pane => pane.id), before.map(pane => pane.id), 'Changing between two-pane layouts replaced a pane')
        assert.equal(await evaluate('document.querySelector(".tile.is-active").dataset.sessionId'), target.id)
        await click('[data-testid="layout-split"]')
        await settle()
        assert.deepEqual(await panePositions(), before)
      }
      const text = `focus-${locale}-${theme}-${mode}`
      await driver.request('Input.insertText', { text })
      await until(async () => (await evaluate('terminalProbe.report()')).writes.some(w => w.id === target.id && w.data === text), 'input to selected pane')
      assert(!(await evaluate('terminalProbe.report()')).writes.some(w => w.id !== target.id && w.data === text), 'Input reached another pane')
      await settle()
      assert.deepEqual(await panePositions(), before, 'Typing scrolled a pane frame or hid its header')
      // Header, sidebar and the already selected layout must also preserve slots.
      await driver.request('Input.dispatchMouseEvent', { type: 'mousePressed', x: before[0].x + 30, y: before[0].y + 15, button: 'left', clickCount: 1 })
      await driver.request('Input.dispatchMouseEvent', { type: 'mouseReleased', x: before[0].x + 30, y: before[0].y + 15, button: 'left', clickCount: 1 })
      await settle()
      assert.equal(await evaluate('document.querySelector(".tile.is-active").dataset.sessionId'), before[0].id)
      await click(`.session:nth-child(${ids.indexOf(target.id) + 1})`)
      await click(`[data-testid="layout-${mode}"]`)
      await settle()
      assert.deepEqual(await panePositions(), before)
      await screenshot(`focus-${locale}-${theme}-${mode}`)
      const hidden = ids.find(id => !before.some(pane => pane.id === id))
      await click(`.session:nth-child(${ids.indexOf(hidden) + 1})`)
      await settle()
      const next = await panePositions()
      assert(next.some(pane => pane.id === hidden), 'Selecting a hidden session did not show it')
      assert.equal(new Set(next.map(pane => pane.id)).size, before.length)
      results.push({ label: `stable-focus-${locale}-${theme}-${mode}`, slots: before, active: target.id, hiddenSelection: hidden })
    }
  }
  // Explicit Tile remains an intentional way to choose a new pair.
  await click('.session:nth-child(5) .pin')
  await settle()
  assert.equal(await evaluate('document.querySelector(".tiles").dataset.layout'), 'split')
  assert.deepEqual((await panePositions()).map(pane => pane.id), [ids[4], ids[0]])
  results.push({ label: 'explicit-tile-pair', passed: true })
  await click('[data-testid="layout-single"]')
  await click('.session:nth-child(1)')
  await settle()
  await click('[data-testid="layout-grid"]')
  await settle()
  await evaluate(`globalThis.overlayStyle = document.createElement('style'); overlayStyle.textContent = '.xterm-viewport::-webkit-scrollbar { width: 0px; }'; document.head.append(overlayStyle)`)
  await settle()
  await checkGeometry('emulated-overlay-scrollbar')
  await scroll('emulated-overlay-scrollbar')
  await screenshot('overlay-scrollbar')
  await evaluate('overlayStyle.remove()')
  for (const locale of ['it', 'en']) for (const theme of ['light', 'dark']) {
    for (const fontSize of [11, 13, 20]) {
      await evaluate(`plancia.updateSettings(${JSON.stringify({ locale, theme, fontSize })})`)
      for (const [width, height, deviceScaleFactor] of [[1280, 820, 1], [860, 560, 1], [1440, 900, 2]]) {
        await driver.request('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile: false })
        for (const mode of modes) {
          await click(`[data-testid="layout-${mode}"]`)
          await settle()
          await checkGeometry(`${locale}-${theme}-${fontSize}-${width}-${deviceScaleFactor}-${mode}`)
        }
      }
    }
    await screenshot(`${locale}-${theme}`)
  }
  await click('[data-testid="layout-single"]')
  await settle()
  const report = await evaluate('terminalProbe.report()')
  const size = report.resizes.filter(r => r.id === ids[0]).at(-1)
  const current = (await metrics())[0]
  assert.equal(current.rows, size.rows, 'PTY and renderer row counts differ')
  // Use the public bridge's last published dimensions to exercise the final column.
  await emit(ids[0], `\x1b[2J\x1b[H\x1b[?25h${'X'.repeat(size.cols - 1)}Z`)
  await settle()
  assert((await metrics())[0].first.endsWith('Z'), 'Last column missing')
  await checkGeometry('last-column-and-cursor')
  const rowY = current.screen.y + current.screen.height / current.rows / 2
  const left = current.screen.x + 2
  const right = current.screen.right - 2
  await driver.request('Input.dispatchMouseEvent', { type: 'mousePressed', x: left, y: rowY, button: 'left', clickCount: 1 })
  await driver.request('Input.dispatchMouseEvent', { type: 'mouseMoved', x: right, y: rowY, button: 'left', buttons: 1 })
  await driver.request('Input.dispatchMouseEvent', { type: 'mouseReleased', x: right, y: rowY, button: 'left', clickCount: 1 })
  await settle()
  assert(await evaluate(`(() => {
    const term = document.querySelector('.tile:not([hidden]) .xterm');
    const viewport = term.querySelector('.xterm-viewport');
    const left = viewport.getBoundingClientRect().x;
    const selections = [...term.querySelectorAll('.xterm-selection div')];
    return selections.length > 0 && selections.every(el => el.getBoundingClientRect().right <= left + viewport.clientWidth + 0.5);
  })()`), 'Selection missing or overlapping the scrollbar')
  await screenshot('last-column')
  // Alternate-screen programs own their scrolling; do not invent scrollback.
  await emit(ids[0], '\x1b[?1049h\x1b[2J\x1b[H' + output)
  await settle()
  const alternate = (await metrics())[0]
  results.push({ label: 'alternate-scroll-range', panes: [alternate] })
  // xterm 5 can retain the largest previous row capacity in an inactive alternate
  // buffer. Check that further output does not turn this into normal scrollback.
  await emit(ids[0], output)
  await settle()
  assert.equal((await metrics())[0].scrollHeight, alternate.scrollHeight, 'Alternate buffer acquired growing scrollback')
  await checkGeometry('alternate-buffer')
  await screenshot('alternate-buffer')
  await emit(ids[0], '\x1b[?1049l')
  await settle()
  await scroll('normal-buffer-restored')
  assert(await evaluate('originalTerminals.every(term => term.isConnected)'), 'Terminal remounted')
  assert.equal((await evaluate('terminalProbe.report()')).subscriptions.length, ids.length, 'Terminal resubscribed')
  assert((await evaluate('terminalProbe.report()')).resizes.every(r => r.cols > 1 && r.rows > 0), 'Zero-size PTY')
  await writeFile(path.join(root, 'report.json'), JSON.stringify({ platform: process.platform, results }, null, 2))
  console.log(JSON.stringify({ smoke: 'terminal-geometry-passed', platform: process.platform, root, scenarios: results.length }))
} catch (error) {
  if (driver) {
    const shot = await driver.request('Page.captureScreenshot').catch(() => null)
    if (shot) await writeFile(path.join(root, 'failure.png'), Buffer.from(shot.data, 'base64'))
  }
  await writeFile(path.join(root, 'report.json'), JSON.stringify({ error: String(error), results }, null, 2))
  console.error(JSON.stringify({ geometryFailure: String(error), drags: results.filter(result => result.label.endsWith('-drag')) }))
  console.error('Geometry evidence: ' + root)
  throw error
} finally {
  driver?.close()
  child.kill()
}
