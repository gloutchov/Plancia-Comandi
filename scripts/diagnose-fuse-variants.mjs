import { spawn } from 'node:child_process'
import { isWindowsAppExe } from './packaged-app-names.mjs'
import { access, mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { readExecutableIntegrity } from './asar-integrity-resource.mjs'
import {
  copyBundle,
  fuseTarget,
  loadFuses,
  readFuseStates,
  sealDarwinApp,
  variantFuseConfig,
} from './electron-fuses.mjs'
import { processExitDetail } from './fuse-smoke-cases.mjs'
import {
  STARTUP_HOLD_MS,
  collectDiagnosticTails,
  launchArgs,
  prepareIsolatedCase,
  readStartupTrace,
  reapAppImages,
  spawnTracked,
  stillRunning,
  stopTracked,
} from './fuse-smoke-launch.mjs'
import { discoverMacApp } from './package-macos.mjs'

const finalDir = path.resolve(process.argv[2] ?? '')
const output = path.resolve(process.argv[3] ?? '')
if (!process.argv[2] || !process.argv[3]) {
  console.error('Usage: node scripts/diagnose-fuse-variants.mjs <unpacked-dir> <output-json>')
  process.exit(1)
}

const variants = [
  ['integrity', 'enableEmbeddedAsarIntegrityValidation'],
  ['asar', 'onlyLoadAppFromAsar'],
  ['both', 'enableEmbeddedAsarIntegrityValidation+onlyLoadAppFromAsar'],
]

async function cleanLaunch(executable) {
  const reap = await reapAppImages(executable)
  const dir = await mkdtemp(path.join(os.tmpdir(), 'plancia-fuse-variant-'))
  const profile = await prepareIsolatedCase(dir, { startupTrace: true })
  const started = Date.now()
  const handle = spawnTracked(executable, launchArgs(profile, [`--user-data-dir=${profile.userData}`]), profile)
  const deadline = Date.now() + STARTUP_HOLD_MS
  while (!handle.state.exited && Date.now() < deadline) await delay(100)
  let alive = false
  try { alive = await stillRunning(handle) } catch { alive = false }
  const detail = processExitDetail(handle.state)
  const logs = await collectDiagnosticTails([profile.userData, profile.dir]).catch(() => [])
  const startup = await readStartupTrace(profile.dir)
  try { await stopTracked(handle) } catch (error) {
    detail.stopError = String(error.message || error).slice(0, 300)
  }
  await rm(dir, { recursive: true, force: true })
  return { outcome: alive ? 'alive' : 'exited', durationMs: Date.now() - started, reap, ...detail, startup, logs }
}

function runTool(command, args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let outputText = ''
    const timer = setTimeout(() => { child.kill(); resolve({ code: null, output: outputText.slice(-400), timedOut: true }) }, timeoutMs)
    child.stdout?.on('data', (chunk) => { outputText = (outputText + chunk).slice(-2000) })
    child.stderr?.on('data', (chunk) => { outputText = (outputText + chunk).slice(-2000) })
    child.once('error', (error) => { clearTimeout(timer); resolve({ code: null, output: String(error.message || error).slice(0, 300), timedOut: false }) })
    child.once('exit', (code) => { clearTimeout(timer); resolve({ code, output: outputText.slice(-400), timedOut: false }) })
  })
}

async function sevenZip() {
  const candidates = process.platform === 'win32'
    ? ['7z', 'C:\\Program Files\\7-Zip\\7z.exe']
    : ['7z']
  for (const candidate of candidates) {
    const probe = await runTool(candidate, [], 8000)
    if (!/ENOENT|not found/i.test(probe.output)) return candidate
  }
  return null
}

async function findInstalledExe(root) {
  const found = []
  async function walk(dir, depth) {
    if (depth > 5 || found.length > 8) return
    let entries = []
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full, depth + 1)
      else if (isWindowsAppExe(entry.name)) found.push(full)
    }
  }
  await walk(root, 0)
  for (const exe of found) {
    try {
      await access(path.join(path.dirname(exe), 'resources', 'app.asar'))
      return exe
    } catch { /* a helper exe without the archive */ }
  }
  return null
}

async function packagedExecutable(role, archive) {
  if (process.platform !== 'win32') return { role, skipped: 'not-windows' }
  const notes = []
  const zip = await sevenZip()
  const extracted = await mkdtemp(path.join(os.tmpdir(), 'plancia-integrity-'))
  try {
    if (!zip) notes.push('7z-missing')
    else {
      const unpacked = await runTool(zip, ['x', archive, `-o${extracted}`, '-y'], 120000)
      const exe = await findInstalledExe(extracted)
      if (exe) return { role, source: '7z', ...(await readExecutableIntegrity(exe)) }
      notes.push(`7z:${unpacked.code ?? 'error'}`)
    }
    if (role === 'installer') {
      const installed = await mkdtemp(path.join(os.tmpdir(), 'plancia-installed-'))
      const setup = await runTool(archive, ['/S', `/D=${installed}`], 180000)
      const installedExe = await findInstalledExe(installed)
      if (installedExe) {
        const report = { role, source: 'nsis', ...(await readExecutableIntegrity(installedExe)) }
        await rm(installed, { recursive: true, force: true }).catch(() => {})
        return report
      }
      await rm(installed, { recursive: true, force: true }).catch(() => {})
      notes.push(`nsis:${setup.code ?? 'error'}`)
    }
    if (zip) {
      const nested = []
      async function walkArchives(dir, depth) {
        if (depth > 3 || nested.length > 4) return
        let entries = []
        try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
        for (const entry of entries) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) await walkArchives(full, depth + 1)
          else if (entry.name.toLowerCase().endsWith('.7z')) nested.push(full)
        }
      }
      await walkArchives(extracted, 0)
      for (const archiveFile of nested) {
        const dest = `${archiveFile}-unpacked`
        await runTool(zip, ['x', archiveFile, `-o${dest}`, '-y'], 120000)
      }
      const nestedExe = await findInstalledExe(extracted)
      if (nestedExe) return { role, source: '7z-nested', ...(await readExecutableIntegrity(nestedExe)) }
    }
    return { role, source: 'not-found', notes, present: false }
  } catch (error) {
    return { role, present: false, notes, error: String(error.message || error).slice(0, 300) }
  } finally {
    await rm(extracted, { recursive: true, force: true }).catch(() => {})
  }
}

async function describeExe(role, exePath) {
  try {
    return { role, ...(await readExecutableIntegrity(exePath)) }
  } catch (error) {
    return { role, exe: path.basename(exePath), present: false, error: String(error.message || error).slice(0, 300) }
  }
}

const integrity = []
const releaseExe = fuseTarget(finalDir, process.platform, await readdir(finalDir).catch(() => []))
if (process.platform === 'win32') integrity.push(await describeExe('release-unpacked', releaseExe))
else integrity.push({ role: 'release-unpacked', skipped: 'not-windows' })
const twinDir = `${finalDir}-open-fuses`
const twinEntries = await readdir(twinDir).catch(() => null)
if (process.platform === 'win32' && twinEntries) integrity.push(await describeExe('twin', fuseTarget(twinDir, process.platform, twinEntries)))
else integrity.push({ role: 'twin', skipped: twinEntries ? 'not-windows' : 'twin-missing' })

const results = []
for (const [kind, label] of variants) {
  const dest = `${finalDir}-variant-${kind}`
  let result
  try {
    await copyBundle(finalDir, dest)
    const entries = await readdir(dest)
    const target = fuseTarget(dest, process.platform, entries)
    await loadFuses().flipFuses(target, variantFuseConfig(kind))
    await sealDarwinApp(dest)
    const states = await readFuseStates(target)
    const executable = process.platform === 'darwin' ? discoverMacApp(dest).executable : target
    const resource = process.platform === 'win32' ? await describeExe(`variant-${kind}`, executable) : { role: `variant-${kind}`, skipped: 'not-windows' }
    integrity.push(resource)
    result = { variant: label, states, integrity: resource, ...await cleanLaunch(executable) }
  } catch (error) {
    result = { variant: label, outcome: 'setup-failed', message: String(error.message || error).slice(0, 500) }
  } finally {
    await rm(dest, { recursive: true, force: true }).catch(() => {})
  }
  results.push(result)
  console.log(JSON.stringify(result))
}

if (process.platform === 'win32') {
  const releaseDir = path.dirname(finalDir)
  const names = await readdir(releaseDir).catch(() => [])
  for (const name of names) {
    const role = /-portable\.exe$/i.test(name) ? 'portable' : /-setup\.exe$/i.test(name) ? 'installer' : null
    if (!role) continue
    const report = await packagedExecutable(role, path.join(releaseDir, name))
    integrity.push(report)
    console.log(JSON.stringify(report))
  }
}

await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, JSON.stringify({ variants: results, integrity }, null, 2))
console.log(JSON.stringify({ wrote: path.basename(output), variants: results.length, integrity: integrity.length }))
