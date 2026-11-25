import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import { isolateBeforeMain, prepareIsolatedSmokeRoot } from './smoke-driver.mjs'
import { assertDefaultFuses, readFuseStates } from './electron-fuses.mjs'

// External probe only, on an open-fuse twin. It neither installs nor pins the
// app, reads personal Shell shortcuts, clears caches, or opens a real shell.
assert.equal(process.platform, 'win32', 'This regression requires native Windows')
const [executableArgument, sourceArgument] = process.argv.slice(2)
assert(executableArgument && sourceArgument, 'Usage: node scripts/smoke-windows-icon.mjs <open-fuse-twin-executable> <source-checkout>')
const executable = path.resolve(executableArgument)
const source = path.resolve(sourceArgument)
assertDefaultFuses(await readFuseStates(executable))
const root = await mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'plancia-windows-icon-'))
const { env } = await prepareIsolatedSmokeRoot(root)
const server = net.createServer()
await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
const inspectorPort = server.address().port
await new Promise(resolve => server.close(resolve))
const child = spawn(executable, [`--inspect-brk=127.0.0.1:${inspectorPort}`], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
const finished = once(child, 'exit').catch(() => {})
let exited = false
let launchError
let diagnostics = ''
child.on('error', error => { launchError = error })
child.on('exit', () => { exited = true })
for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-2000) })
async function until(task, label) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (launchError) throw launchError
    assert(!exited, `Fixture exited during ${label}: ${diagnostics}`)
    const value = await task()
    if (value) return value
    await delay(100)
  }
  throw new Error(`Timed out: ${label}`)
}
let main
try {
  main = await isolateBeforeMain({ diagnostics: () => diagnostics, until, root, inspectorPort })
  await main.evaluate('__smokeElectron.BrowserWindow.prototype.show = function () {}', false)
  await main.resume()
  const window = await until(() => main.evaluate(`(() => {
    const win = __smokeElectron.BrowserWindow.getAllWindows()[0];
    if (!win || win.webContents.isLoading()) return null;
    return { handle: win.getNativeWindowHandle().readBigUInt64LE().toString(), resources: process.resourcesPath, electron: process.versions.electron };
  })()`), 'native window')
  const inputFile = path.join(root, 'input.json')
  const reference = path.join(source, 'build', 'icon.ico')
  await writeFile(inputFile, JSON.stringify({ handle: window.handle, reference }))
  // Windows PowerShell 5.1 provides System.Drawing without extra dependencies.
  // Use its absolute system path, static script and arguments, no policy bypass.
  const powershell = path.join(env.SystemRoot || env.SYSTEMROOT, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  const script = fileURLToPath(new URL('./windows-icon-probe.ps1', import.meta.url))
  const { stdout } = await promisify(execFile)(powershell, ['-NoProfile', '-NonInteractive', '-File', script, '-InputFile', inputFile], { env, windowsHide: true, timeout: 15000, maxBuffer: 4096 })
  const result = JSON.parse(stdout.replace(/^\uFEFF/, '').trim())
  await writeFile(path.join(root, 'report.json'), JSON.stringify({ ...window, ...result }, null, 2))
  assert.equal(result.smallMatches, true, 'Small native icon differs from canonical ICO')
  assert.equal(result.largeMatches, true, 'Large native icon differs from canonical ICO')
  assert.equal(result.appId, 'it.plancia.comandi', 'Window taskbar AppUserModelID missing or changed')
  const icon = path.join(window.resources, 'icon.ico')
  assert.equal(result.iconResource, `${icon},0`, 'Taskbar icon must reference the real external ICO')
  assert.deepEqual(await readFile(icon), await readFile(reference), 'Taskbar resource differs from the canonical ICO')
  console.log(JSON.stringify({ smoke: 'windows-icon-passed', root, electron: window.electron, ...result }))
} catch (error) {
  await writeFile(path.join(root, 'failure.json'), JSON.stringify({ error: String(error).slice(0, 1000) }))
  console.error(JSON.stringify({ smoke: 'windows-icon-failed', root }))
  throw error
} finally {
  if (main) await main.evaluate('__smokeElectron.app.quit()', false).catch(() => {})
  main?.close()
  // Terminate only the process started above, never other app instances.
  if (!exited) child.kill()
  await Promise.race([finished, delay(5000)])
  if (!exited) child.kill('SIGKILL')
}
