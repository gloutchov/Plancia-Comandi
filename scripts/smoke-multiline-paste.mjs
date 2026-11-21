import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { connectProtocol, prepareIsolatedSmokeRoot } from './smoke-driver.mjs'

// Real renderer/xterm; external bridge and clipboard only, no shell or OS clipboard.
const project = path.resolve(process.argv[2] ?? '.')
// Optional app.asar path: exercise the exact renderer included in a package.
const renderer = path.resolve(process.argv[3] ?? project)
const version = JSON.parse(await readFile(path.join(project, 'package.json'), 'utf8')).version
const [major, minor, patch] = version.split(/[.-]/).map(Number)
if (major === 0 && (minor < 3 || (minor === 3 && patch < 15))) {
  console.log(JSON.stringify({ smoke: 'multiline-paste-skipped', version }))
  process.exit(0)
}
const root = await mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'plancia-multiline-paste-'))
const { env } = await prepareIsolatedSmokeRoot(root)
const server = net.createServer()
await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
const port = server.address().port
await new Promise(resolve => server.close(resolve))
const executable = path.join(project, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron.app/Contents/MacOS/Electron')
const fixture = fileURLToPath(new URL('./fixtures/terminal-stream-main.cjs', import.meta.url))
const child = spawn(executable, [fixture, renderer, root, String(port)], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
let exited = false
let diagnostics = ''
child.on('exit', () => { exited = true })
child.on('error', error => { diagnostics = String(error); exited = true })
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { diagnostics = (diagnostics + data).slice(-3000) })
let driver
const scenarios = []
async function until(task, label) {
  for (let attempt = 0; attempt < 150; attempt++) {
    assert(!exited, `Fixture exited: ${label}: ${diagnostics}`)
    const value = await task()
    if (value) return value
    await delay(100)
  }
  throw new Error('Timed out: ' + label)
}
try {
  const page = await until(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })
      return (await response.json()).find(page => page.type === 'page' && page.url.startsWith('file:'))
    } catch { return null }
  }, 'renderer')
  driver = await connectProtocol(page.webSocketDebuggerUrl)
  const evaluate = driver.evaluate
  const id = '00000000-0000-4000-8000-000000000001'
  const report = () => evaluate('terminalProbe.report()')
  const clipboard = value => evaluate(`terminalProbe.clipboard(${JSON.stringify(value)})`)
  const dialog = '[data-testid="paste-confirmation"]'
  const waitDialog = () => until(() => evaluate(`Boolean(document.querySelector('${dialog}'))`), 'confirmation')
  const waitClosed = () => until(() => evaluate(`!document.querySelector('${dialog}')`), 'closed confirmation')
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const key = async (name, code = name, modifiers = 0, keyCode = 0) => {
    await driver.request('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, modifiers, windowsVirtualKeyCode: keyCode, ...(name === 'Enter' ? { text: '\r' } : {}) })
    await driver.request('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: keyCode })
  }
  const focus = async () => {
    await evaluate('document.querySelector(".tile:not([hidden]) .xterm-helper-textarea").focus()')
    await until(() => evaluate('document.activeElement?.classList.contains("xterm-helper-textarea")'), 'terminal focus')
  }
  const drop = text => evaluate(`(() => {
    const data = new DataTransfer(); data.setData('text/plain', ${JSON.stringify(text)});
    document.querySelector('.tile:not([hidden]) .term-host').dispatchEvent(new DragEvent('drop', {bubbles:true,cancelable:true,dataTransfer:data}));
  })()`)
  const waitFocus = () => until(() => evaluate('document.activeElement?.classList.contains("xterm-helper-textarea")'), 'restored terminal focus')
  const cancel = async () => { await click(`${dialog} button:first-child`); await waitClosed(); await waitFocus() }
  const confirm = async () => { await click(`${dialog} button:last-child`); await waitClosed(); await waitFocus() }
  await until(() => evaluate('document.querySelectorAll(".xterm").length === 3'), 'terminals')
  await until(async () => (await report()).writes.length >= 9 && (await report()).subscriptions.length === 3, 'initial protocol replies')
  await evaluate('void (globalThis.originalPasteTerminal = document.querySelector(".xterm"))')
  await focus()
  await delay(100)

  for (const text of ['M36_PRIVATE\nSECOND', 'single with final\n', 'bare\rreturn']) {
    const before = (await report()).writes.length
    await clipboard({ text })
    await key('v', 'KeyV', process.platform === 'darwin' ? 4 : 10, 86)
    await waitDialog()
    assert.equal((await report()).writes.length, before, 'Text sent before a decision')
    assert.equal(await evaluate('document.body.textContent.includes("M36_PRIVATE")'), false, 'Clipboard contents exposed in the dialog')
    assert(await evaluate(`document.activeElement === document.querySelector('${dialog} button:first-child')`), 'Cancel is not initially focused')
    await evaluate('document.querySelector(".xterm-helper-textarea").focus()')
    assert(await evaluate(`document.activeElement === document.querySelector('${dialog} button:first-child')`), 'Focus escaped to the terminal')
    await key('Tab', 'Tab', 8, 9)
    assert(await evaluate(`document.activeElement === document.querySelector('${dialog} button:last-child')`), 'Shift+Tab escaped the confirmation')
    await key('Tab', 'Tab', 8, 9)
    assert(await evaluate(`document.activeElement === document.querySelector('${dialog} button:first-child')`))
    await key('Tab', 'Tab', 0, 9)
    assert(await evaluate(`document.activeElement === document.querySelector('${dialog} button:last-child')`))
    await key('Tab', 'Tab', 0, 9)
    assert(await evaluate(`document.activeElement === document.querySelector('${dialog} button:first-child')`), 'Tab escaped the confirmation')
    await key('Escape', 'Escape', 0, 27)
    await waitClosed()
    assert.equal((await report()).writes.length, before, 'Escape sent clipboard text')
    await focus()
  }
  const enterBefore = (await report()).writes.length
  await drop('cancel with Enter\n')
  await waitDialog()
  await key('Enter', 'Enter', 0, 13)
  await waitClosed()
  assert.equal((await report()).writes.length, enterBefore, 'Default Enter accepted a paste')
  await focus()
  await drop('outside cancel\n')
  await waitDialog()
  await evaluate('document.querySelector(".overlay").dispatchEvent(new MouseEvent("mousedown", {bubbles:true}))')
  await waitClosed()
  await waitFocus()
  assert.equal((await report()).writes.length, enterBefore, 'Outside cancellation sent text')

  // Immediate Edit acknowledgment must not wait for clipboard reads or a human decision.
  const beforeMenu = await report()
  await clipboard({ text: 'menu\npaste', delayMs: 600 })
  await evaluate('terminalProbe.edit("m36-menu")')
  await until(async () => (await report()).editResults.find(result => result.id === 'm36-menu'), 'Edit acknowledgment')
  let menuResult = (await report()).editResults.find(result => result.id === 'm36-menu')
  assert.equal(menuResult.handled, true)
  assert.equal(menuResult.imageReads, beforeMenu.clipboardReads.image, 'Clipboard IPC started before Edit acknowledgment')
  assert.equal(menuResult.textReturns, beforeMenu.clipboardReads.returned, 'Edit acknowledgment waited for clipboard text')
  await waitDialog()
  await delay(500)
  assert.equal((await report()).writes.length, beforeMenu.writes.length)
  await evaluate('terminalProbe.edit("m36-blocked", true)')
  await until(async () => (await report()).editResults.some(result => result.id === 'm36-blocked'), 'blocked accelerator acknowledgment')
  assert.equal((await report()).clipboardReads.text, beforeMenu.clipboardReads.text + 1, 'A pending paste queued another clipboard read')
  await clipboard({ text: 'changed while waiting' })
  await confirm()
  await until(async () => (await report()).writes.length === beforeMenu.writes.length + 1, 'confirmed menu paste')
  assert.equal((await report()).writes.at(-1).data, 'menu\rpaste', 'Clipboard was reread after confirmation')

  // Native ClipboardEvent must not bypass the common guard/xterm paste path.
  const nativeBefore = (await report()).writes.length
  await clipboard({ text: 'native\npaste' })
  await evaluate(`(() => {
    const data = new DataTransfer(); data.setData('text/plain', 'BYPASS\\nTEXT');
    document.querySelector('.xterm-helper-textarea').dispatchEvent(new ClipboardEvent('paste', {bubbles:true,cancelable:true,clipboardData:data}));
  })()`)
  await waitDialog()
  assert.equal((await report()).writes.length, nativeBefore)
  await cancel()
  assert.equal((await report()).writes.length, nativeBefore)

  // Context menu uses the same clipboard snapshot and confirmation.
  await clipboard({ text: 'context\npaste' })
  await evaluate('document.querySelector(".term-host").dispatchEvent(new MouseEvent("contextmenu", {bubbles:true,cancelable:true,clientX:350,clientY:250}))')
  await until(() => evaluate('Boolean(document.querySelector(".term-menu"))'), 'context menu')
  await click('.term-menu button:last-child')
  await waitDialog()
  await cancel()
  assert.equal((await report()).writes.length, nativeBefore)

  // Bracketed paste stays immediate and retains xterm's own delimiters/normalization.
  await evaluate(`terminalProbe.emit(${JSON.stringify(id)}, '\\x1b[?2004h')`)
  await delay(100)
  await clipboard({ text: 'bracketed\ntext' })
  await key('v', 'KeyV', process.platform === 'darwin' ? 4 : 10, 86)
  await until(async () => (await report()).writes.length === nativeBefore + 1, 'bracketed paste')
  assert.equal((await report()).writes.at(-1).data, '\x1b[200~bracketed\rtext\x1b[201~')
  assert.equal(await evaluate(`Boolean(document.querySelector('${dialog}'))`), false)
  await evaluate(`terminalProbe.emit(${JSON.stringify(id)}, '\\x1b[?2004l')`)
  await delay(100)
  await clipboard({ text: 'one line' })
  await key('v', 'KeyV', process.platform === 'darwin' ? 4 : 10, 86)
  await until(async () => (await report()).writes.length === nativeBefore + 2, 'single-line paste')
  assert.equal((await report()).writes.at(-1).data, 'one line')

  await evaluate(`terminalProbe.name(${JSON.stringify(id)}, ${JSON.stringify('W'.repeat(80))})`)
  for (const locale of ['it', 'en']) for (const theme of ['light', 'dark']) for (const [width, height] of [[1440,900],[1280,820],[860,560]]) {
    await evaluate(`plancia.updateSettings(${JSON.stringify({locale,theme})})`)
    await until(() => evaluate(`document.documentElement.lang === '${locale}' && document.documentElement.dataset.theme === '${theme}'`), 'locale/theme')
    await driver.request('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor:1, mobile:false })
    await delay(100)
    const before = (await report()).writes.length
    await drop('DROP_PRIVATE\nSECOND')
    await waitDialog()
    assert.equal((await report()).writes.length, before)
    assert(await evaluate(`(() => {
      const modal=document.querySelector('${dialog}');const box=modal.getBoundingClientRect();
      return box.left>=0 && box.top>=0 && box.right<=innerWidth+1 && box.bottom<=innerHeight+1 && modal.scrollWidth<=modal.clientWidth+1 && !modal.textContent.includes('DROP_PRIVATE');
    })()`), 'Dialog overflows or exposes text')
    if (process.platform === 'darwin') assert.equal(await evaluate(`getComputedStyle(document.querySelector('${dialog}')).webkitAppRegion`), 'no-drag')
    const shot = await driver.request('Page.captureScreenshot')
    await writeFile(path.join(root, `${locale}-${theme}-${width}.png`), Buffer.from(shot.data,'base64'))
    await key('Tab','Tab',0,9)
    await key('Enter','Enter',0,13)
    await waitClosed()
    await until(async () => (await report()).writes.length===before+1, 'confirmed drop')
    assert.equal((await report()).writes.at(-1).data,'DROP_PRIVATE\rSECOND')
    await focus()
    assert(await evaluate('originalPasteTerminal === document.querySelector(".xterm")'),'Confirmation recreated the terminal')
    assert.equal((await report()).subscriptions.length,3,'Confirmation resubscribed terminals')
    scenarios.push({locale,theme,width,height,passed:true})
  }
  const disposeBefore = (await report()).writes.length
  await drop('closed session\nno send')
  await waitDialog()
  await evaluate(`terminalProbe.remove(${JSON.stringify(id)})`)
  await waitClosed()
  assert.equal((await report()).writes.length,disposeBefore,'Closing owner sent pending text')
  const result={smoke:'multiline-paste-passed',version,platform:process.platform,root,scenarios,checks:['LF/CR/final newline','clipboard snapshot','native/context/Edit paste','immediate Edit acknowledgment','pending input rejection','Cancel/Escape/default Enter','Tab loop','single-line/bracketed paste','drop confirmation','long session name','terminal persistence','owner disposal']}
  await writeFile(path.join(root,'report.json'),JSON.stringify(result,null,2))
  console.log(JSON.stringify(result))
} catch(error) {
  if(driver){const shot=await driver.request('Page.captureScreenshot').catch(()=>null);if(shot)await writeFile(path.join(root,'failure.png'),Buffer.from(shot.data,'base64'))}
  await writeFile(path.join(root,'report.json'),JSON.stringify({error:String(error),scenarios},null,2))
  console.error('Multiline-paste evidence retained at '+root)
  throw error
} finally {
  driver?.close()
  child.kill()
}
