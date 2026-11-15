import assert from 'node:assert/strict'
import { mkdir, readFile, rename, rmdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** A real storage failure in the synthetic profile; never use a personal profile. */
export async function smokeSettings({ evaluate, until, request, root, userData, expectedVersion, capture = false }) {
  const [major, minor, patch] = expectedVersion.split(/[.-]/).map(Number)
  if (major === 0 && (minor < 3 || (minor === 3 && patch < 6))) return false
  assert.equal(path.resolve(userData), path.join(path.resolve(root), 'user-data'))
  const boot = await evaluate('window.plancia.boot()')
  assert.equal(boot.settings.lastCwd, root, 'Refusing storage smoke without synthetic preferences')
  const file = path.join(userData, 'settings.json')
  const saved = path.join(root, 'settings-smoke-saved.json')
  const original = await readFile(file)
  await rename(file, saved)
  await mkdir(file)
  try {
    for (const locale of ['it', 'en']) for (const theme of ['light', 'dark']) {
      await evaluate('window.plancia.updateSettings(' + JSON.stringify({ locale, theme }) + ')')
      await until(() => evaluate('window.plancia.boot().then(b => b.settingsWarning === "write-failed")'), 'Storage failure warning missing')
      await request('Page.reload')
      const expected = locale === 'it' ? 'Impossibile salvare le preferenze.' : 'Could not save preferences.'
      await until(async () => {
        try { return await evaluate('document.documentElement.lang === ' + JSON.stringify(locale) + ' && document.documentElement.dataset.theme === ' + JSON.stringify(theme) + ' && document.querySelector("[data-testid=settings-warning]")?.textContent.includes(' + JSON.stringify(expected) + ')') }
        catch { return false }
      }, 'Localized preference warning did not render')
      const visible = await evaluate('(() => { const p=document.querySelector("[data-testid=settings-warning]"),b=p.getBoundingClientRect();return {readable:p.scrollWidth<=p.clientWidth && b.height>15,overflow:document.documentElement.scrollWidth>innerWidth,clip:{x:b.x,y:b.y,width:b.width,height:b.height,scale:1}}})()')
      assert.equal(visible.readable, true); assert.equal(visible.overflow, false)
      if (capture) {
        const dir = path.join(root, 'output', 'playwright'); await mkdir(dir, { recursive: true })
        const shot = await request('Page.captureScreenshot', { format: 'png', clip: visible.clip })
        await writeFile(path.join(dir, 'settings-warning-' + locale + '-' + theme + '.png'), Buffer.from(shot.data, 'base64'))
      }
      assert.deepEqual(await readFile(saved), original)
    }
  } finally {
    await rmdir(file)
    await rename(saved, file)
  }
  await evaluate('window.plancia.updateSettings({locale:"en",theme:"light"})')
  await until(() => evaluate('window.plancia.boot().then(b => !b.settingsWarning && !document.querySelector("[data-testid=settings-warning]"))'), 'Preference saving did not recover')
  const persisted = JSON.parse(await readFile(file, 'utf8'))
  assert.equal(persisted.locale, 'en'); assert.equal(persisted.theme, 'light')
  return true
}
