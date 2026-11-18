import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { isolateBeforeMain, prepareIsolatedSmokeRoot } from './smoke-driver.mjs'
import { hasDevelopmentSmoke, developmentSmokeEnvironment, assertNoDevelopmentFiles } from './smoke-development-flags.mjs'

const [argument, version] = process.argv.slice(2)
assert(argument && version, 'Usage: node scripts/smoke-startup-failure.mjs <open-fuse-twin-executable> <version>')
if (hasDevelopmentSmoke(version)) {
  const executable = path.resolve(argument)
  const cases = [['it', 'renderer'], ['en', 'renderer'],
    ...Array.from({ length: process.platform === 'win32' ? 10 : 1 }, () => ['it', 'early'])]
  for (const [locale, phase] of cases) {
    const root = await mkdtemp(path.join(os.tmpdir(), 'plancia-startup-failure-'))
    const profile = await prepareIsolatedSmokeRoot(root)
    await writeFile(path.join(profile.userData, 'settings.json'), JSON.stringify({ ...profile.settings, locale }))
    Object.assign(profile.env, developmentSmokeEnvironment(root))
    const server = net.createServer()
    await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
    const inspectorPort = server.address().port
    await new Promise(resolve => server.close(resolve))
    const child = spawn(executable, [`--inspect-brk=127.0.0.1:${inspectorPort}`, `--user-data-dir=${profile.userData}`],
      { cwd: root, env: profile.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let exited = false
    let exitCode = null
    let launchError
    let output = ''
    child.once('error', error => { launchError = error })
    child.once('exit', code => { exited = true; exitCode = code })
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-16000) })
    const until = async (task, message, timeout = 15000) => {
      const deadline = Date.now() + timeout
      do {
        if (launchError) throw launchError
        const value = await task()
        if (value) return value
        await delay(100)
      } while (Date.now() < deadline)
      throw new Error(message)
    }
    let main
    try {
      main = await isolateBeforeMain({ diagnostics: () => output, until, root, inspectorPort })
      // Fault injection and the dialog spy exist only in this disposable debugger.
      // No flag, test API or fault path is added to the product.
      await main.evaluate(`(() => {
        const { app, BrowserWindow, dialog } = __smokeElectron;
        if (!app.isPackaged) throw new Error('Expected a packaged twin');
        const fs = process.getBuiltinModule('fs');
        dialog.showErrorBox = (title, content) => fs.writeFileSync(${JSON.stringify(path.join(root, 'dialog.json'))}, JSON.stringify({ title, content }));
        const failure = () => Object.assign(new Error('SYNTHETIC_PRIVATE /private/test/startup.txt'), { code: 'EACCES', syscall: 'open' });
        if (${JSON.stringify(phase)} === 'early') {
          const getPath = app.getPath.bind(app);
          app.getPath = name => { if (name === 'home') throw failure(); return getPath(name); };
        } else {
          BrowserWindow.prototype.loadURL = function () { return Promise.reject(failure()); };
        }
      })()`, false)
      await main.resume().catch(() => { /* exit may close the debugger during resume */ })
      main.close()
      await until(() => exited, 'Startup failure did not exit')
      if (exitCode !== 1) {
        const dialogWritten = await readFile(path.join(root, 'dialog.json')).then(() => true, () => false)
        console.log(JSON.stringify({ startupFailure: 'failed', locale, phase, exitCode, dialogWritten,
          diagnosticWritten: /"event":"startup-failed"/.test(output) }))
      }
      assert.equal(exitCode, 1)
      const dialog = JSON.parse(await readFile(path.join(root, 'dialog.json'), 'utf8'))
      assert(dialog.title.includes(locale === 'it' ? 'Errore di avvio' : 'Startup error'))
      assert(dialog.content.includes('STARTUP_FAILED'))
      assert(!/SYNTHETIC_PRIVATE|startup\.txt|\/private\/test/.test(JSON.stringify(dialog) + output))
      const diagnostic = output.split(/\r?\n/).map(line => { try { return JSON.parse(line) } catch { return null } })
        .find(line => line?.event === 'startup-failed')
      assert(diagnostic, 'Missing safe startup diagnostic on stderr')
      assert.equal(diagnostic.code, 'EACCES')
      assert.deepEqual(Object.keys(diagnostic).sort(), ['at', 'code', 'event', 'operation'])
      assertNoDevelopmentFiles(root)
      console.log(JSON.stringify({ startupFailure: 'passed', locale, phase, exitCode, temporaryRoot: root }))
    } finally {
      main?.close()
      if (!exited && child.pid) {
        if (process.platform === 'win32') {
          const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
          await new Promise(resolve => killer.once('exit', resolve).once('error', resolve))
        } else child.kill('SIGKILL')
      }
    }
  }
}
