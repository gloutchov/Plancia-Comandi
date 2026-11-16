import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
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
  const dir = await mkdtemp(path.join(os.tmpdir(), 'plancia-fuse-variant-'))
  const profile = await prepareIsolatedCase(dir, { logging: true })
  const started = Date.now()
  const handle = spawnTracked(executable, launchArgs(profile, [`--user-data-dir=${profile.userData}`]), profile)
  const deadline = Date.now() + STARTUP_HOLD_MS
  while (!handle.state.exited && Date.now() < deadline) await delay(100)
  let alive = false
  try { alive = await stillRunning(handle) } catch { alive = false }
  const detail = processExitDetail(handle.state)
  const logs = await collectDiagnosticTails([profile.userData, profile.dir]).catch(() => [])
  try { await stopTracked(handle) } catch (error) {
    detail.stopError = String(error.message || error).slice(0, 300)
  }
  await rm(dir, { recursive: true, force: true })
  return { outcome: alive ? 'alive' : 'exited', durationMs: Date.now() - started, ...detail, logs }
}

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
    result = { variant: label, states, ...await cleanLaunch(executable) }
  } catch (error) {
    result = { variant: label, outcome: 'setup-failed', message: String(error.message || error).slice(0, 500) }
  } finally {
    await rm(dest, { recursive: true, force: true }).catch(() => {})
  }
  results.push(result)
  console.log(JSON.stringify(result))
}

await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, JSON.stringify({ variants: results }, null, 2))
console.log(JSON.stringify({ wrote: path.basename(output), variants: results.length }))
