import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { connectProtocol, isolateBeforeMain, prepareIsolatedSmokeRoot } from './smoke-driver.mjs'

// External probe on the open-fuse twin only. Mock native language APIs before
// the real bundled main runs; no development flag or IPC is added to the app.
const executable = process.argv[2] && path.resolve(process.argv[2])
assert(executable, 'Usage: node scripts/smoke-initial-locale.mjs <open-fuse-twin-executable>')
const root = await mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'plancia-initial-locale-'))
const results = []
async function freePort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}
for (const preferred of ['it-CH', 'pt-BR']) for (const theme of ['light', 'dark']) for (const saved of [false, true]) {
  const detected = preferred.startsWith('it') ? 'it' : 'en'
  const override = detected === 'it' ? 'en' : 'it'
  const expected = saved ? override : detected
  const dir = path.join(root, `${preferred}-${theme}-${saved ? 'saved' : 'fresh'}`)
  const { env, userData } = await prepareIsolatedSmokeRoot(dir)
  const settingsFile = path.join(userData, 'settings.json')
  if (saved) await writeFile(settingsFile, JSON.stringify({ locale: override, theme, fontSize: 17 }))
  else await unlink(settingsFile) // Only the synthetic file just created above.
  const before = saved ? await readFile(settingsFile) : null
  const inspectorPort = await freePort()
  const port = await freePort()
  const child = spawn(executable, [`--inspect-brk=127.0.0.1:${inspectorPort}`, `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1'], {
    cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000,
  })
  let exited = false
  let diagnostics = ''
  let launchError
  child.on('error', error => { launchError = error })
  child.on('exit', () => { exited = true })
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-2000) })
  async function until(task, label) {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (launchError) throw launchError
      assert(!exited, `Fixture exited: ${label}: ${diagnostics}`)
      const value = await task()
      if (value) return value
      await delay(100)
    }
    throw new Error(`Timed out: ${label}`)
  }
  let main
  let renderer
  try {
    main = await isolateBeforeMain({ diagnostics: () => diagnostics, until, root: dir, inspectorPort })
    await main.evaluate(`(() => {
      __smokeElectron.app.getPreferredSystemLanguages = () => ${JSON.stringify([preferred, 'it-IT'])};
      __smokeElectron.app.getLocale = () => 'it';
      __smokeElectron.nativeTheme.themeSource = ${JSON.stringify(theme)};
      Object.defineProperty(__smokeElectron.nativeTheme, 'shouldUseDarkColors', { get: () => ${theme === 'dark'} });
    })()`, false)
    await main.resume()
    const page = await until(async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })
        return (await response.json()).find(page => page.type === 'page' && page.url.startsWith('file:'))
      } catch { return null }
    }, 'renderer')
    renderer = await connectProtocol(page.webSocketDebuggerUrl)
    await until(() => renderer.evaluate('Boolean(document.querySelector(".app"))'), 'workspace')
    const actual = await renderer.evaluate('plancia.boot()')
    assert.equal(actual.settings.locale, expected)
    assert.equal(actual.settings.theme, saved ? theme : 'system')
    if (saved) {
      assert.equal(actual.settings.fontSize, 17)
      assert.deepEqual(await readFile(settingsFile), before, 'Reading existing preferences changed their bytes')
    }
    const name = await main.evaluate('__smokeElectron.app.getName()')
    assert.equal(name, 'Plancia Comandi')
    await until(() => renderer.evaluate(`document.documentElement.lang === ${JSON.stringify(expected)}`), 'document language')
    const menu = await main.evaluate('__smokeElectron.Menu.getApplicationMenu().items.map(item => item.label)')
    assert(menu.includes(expected === 'it' ? 'Vista' : 'View'), 'Initial menu language differs')
    const shot = await renderer.request('Page.captureScreenshot')
    await writeFile(path.join(dir, 'workspace.png'), Buffer.from(shot.data, 'base64'))
    await renderer.evaluate(`plancia.updateSettings({ theme: ${JSON.stringify(theme)} })`)
    assert.equal((await renderer.evaluate('plancia.boot()')).settings.locale, expected)
    results.push({ preferred, theme, saved, expected, name, menu, passed: true })
    console.log(JSON.stringify(results.at(-1)))
  } catch (error) {
    await writeFile(path.join(dir, 'failure.json'), JSON.stringify({ preferred, theme, saved, error: String(error).slice(0, 1000) }))
    if (renderer) {
      const shot = await renderer.request('Page.captureScreenshot').catch(() => null)
      if (shot) await writeFile(path.join(dir, 'failure.png'), Buffer.from(shot.data, 'base64'))
    }
    throw error
  } finally {
    renderer?.close(); main?.close()
    if (!exited) child.kill()
    await untilExit()
  }
  async function untilExit() {
    for (let attempt = 0; !exited && attempt < 30; attempt++) await delay(100)
    if (!exited) child.kill('SIGKILL')
  }
}
await writeFile(path.join(root, 'report.json'), JSON.stringify({ results }, null, 2))
console.log(JSON.stringify({ smoke: 'initial-locale-passed', root, cases: results.length }))
