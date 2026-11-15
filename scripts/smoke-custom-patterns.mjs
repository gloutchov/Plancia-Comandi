import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** Exercise M7 through the real packaged bridge, using synthetic profiles/output. */
export async function smokeCustomPatterns({ evaluate, until, request, sessions, root, expectedVersion, capture = false }) {
  const [major, minor, patch] = expectedVersion.split(/[.-]/).map(Number)
  // The packaging workflow can also be used to rebuild older source revisions.
  if (major === 0 && (minor < 3 || (minor === 3 && patch < 5))) return false
  const first = sessions[0], second = sessions[1]
  await evaluate(`document.querySelectorAll('.session')[0].click(); window.plancia.resize(${JSON.stringify(first)}, 120, 24)`)
  const status = { extraIdlePatterns: [], extraBusyPatterns: ['(a+)+$'], extraAttentionPatterns: [] }
  await evaluate(`window.plancia.updateSettings(${JSON.stringify({ status })})`)
  const output = 'a'.repeat(30) + '!'
  // The detector deliberately reads the bottom 10/12 screen rows. Scroll the
  // synthetic text there even when the PTY starts with a mostly empty screen.
  const command = process.platform === 'win32'
    ? `for /l %i in (1,1,200) do @echo.\recho ${output}\r`
    : `printf '${'\\n'.repeat(200)}%s\\n' '${output}'\r`
  await evaluate(`window.plancia.write(${JSON.stringify(first)}, ${JSON.stringify(command)})`)
  await until(() => evaluate(`window.plancia.boot().then(b => b.sessions.some(s => s.patternWarning === 'timeout'))`), 'Pathological custom regex did not fall back', 10000)
  const start = Date.now()
  assert.equal(await evaluate('window.plancia.boot().then(b => b.version)'), expectedVersion)
  assert(Date.now() - start < 2000, 'The main-process bridge stopped responding')
  const alive = process.platform === 'win32' ? 'echo PLANCIA_REGEX_BRIDGE_ALIVE\r' : "printf 'PLANCIA_REGEX_BRIDGE_ALIVE\\n'\r"
  await evaluate(`window.plancia.write(${JSON.stringify(second)}, ${JSON.stringify(alive)})`)
  await until(() => evaluate(`window.plancia.subscribe(${JSON.stringify(second)}).then(s => s.data.includes('PLANCIA_REGEX_BRIDGE_ALIVE'))`), 'Another PTY stopped while custom regexes timed out')
  await until(() => evaluate(`window.plancia.boot().then(b => b.sessions.some(s => s.id === ${JSON.stringify(second)} && s.phase === 'idle' && s.patternWarning === 'timeout'))`), 'Default detection did not continue after timeout')
  for (const locale of ['it', 'en']) {
    for (const theme of ['light', 'dark']) {
      await evaluate(`window.plancia.updateSettings(${JSON.stringify({ locale, theme })})`)
      // Direct bridge calls update the main model. The normal settings dialog
      // also updates React state; reload here to follow the existing smoke flow.
      await request('Page.reload')
      const expected = locale === 'it' ? 'Rilevamento standard attivo.' : 'Standard detection is active.'
      await until(async () => {
        try { return await evaluate(`document.documentElement.lang === '${locale}' && document.documentElement.dataset.theme === '${theme}' && document.querySelector('[data-testid="pattern-warning"]')?.textContent.includes(${JSON.stringify(expected)})`) }
        catch { return false }
      }, 'Localized pattern warning did not update')
      const visible = await evaluate(`(() => {
        const p = document.querySelector('[data-testid="pattern-warning"]'), b = p.getBoundingClientRect();
        return { readable: p.scrollWidth <= p.clientWidth && b.width > 100 && b.height > 15, overflow: document.documentElement.scrollWidth > innerWidth,
          clip: { x: b.x, y: b.y, width: b.width, height: b.height, scale: 1 } };
      })()`)
      assert.equal(visible.readable, true)
      assert.equal(visible.overflow, false)
      if (capture) {
        const dir = path.join(root, 'output', 'playwright')
        await mkdir(dir, { recursive: true })
        const shot = await request('Page.captureScreenshot', { format: 'png', clip: visible.clip })
        await writeFile(path.join(dir, `pattern-warning-${locale}-${theme}.png`), Buffer.from(shot.data, 'base64'))
      }
    }
  }
  await evaluate(`window.plancia.updateSettings(${JSON.stringify({ status: { extraIdlePatterns: ['['], extraBusyPatterns: [], extraAttentionPatterns: [] } })})`)
  await until(() => evaluate(`window.plancia.boot().then(b => b.sessions.some(s => s.patternWarning === 'invalid'))`), 'Invalid regex warning missing')
  const marker = 'ZX_CUSTOM_SIGNAL_7319'
  await evaluate(`window.plancia.updateSettings(${JSON.stringify({ status: { extraIdlePatterns: [], extraBusyPatterns: [], extraAttentionPatterns: [marker] } })})`)
  const signal = process.platform === 'win32'
    ? `for /l %i in (1,1,200) do @echo.\recho ${marker}\r`
    : `printf '${'\\n'.repeat(200)}%s\\n' '${marker}'\r`
  await evaluate(`window.plancia.resize(${JSON.stringify(second)},120,24);window.plancia.write(${JSON.stringify(second)},${JSON.stringify(signal)})`)
  await until(() => evaluate(`window.plancia.boot().then(b => b.sessions.some(s => s.id === ${JSON.stringify(second)} && s.phase === 'attention' && s.reason === 'screen-attention' && !s.patternWarning))`), 'Valid custom pattern did not update the real session status')
  await evaluate(`window.plancia.updateSettings(${JSON.stringify({ status: { extraIdlePatterns: [], extraBusyPatterns: [], extraAttentionPatterns: [] } })})`)
  await until(() => evaluate(`window.plancia.boot().then(b => b.sessions.every(s => !s.patternWarning) && !document.querySelector('[data-testid="pattern-warning"]'))`), 'Custom pattern fallback did not reset')
  await evaluate(`window.plancia.closeSession(${JSON.stringify(first)})`)
  sessions.shift()
  await until(() => evaluate(`window.plancia.boot().then(b => !b.sessions.some(s => s.id === ${JSON.stringify(first)}))`), 'Regex test session did not close')
  const reopened = await evaluate(`window.plancia.createSession(${JSON.stringify({ name: 'Regex reopen', shellId: process.platform === 'win32' ? 'cmd' : 'zsh', cwd: root })})`)
  assert.equal(reopened.ok, true)
  assert.equal(reopened.session.patternWarning, undefined)
  sessions.push(reopened.session.id)
  return true
}
