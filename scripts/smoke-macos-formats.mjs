import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertReleaseFuses, readFuseStates } from './electron-fuses.mjs'
import { discoverMacApp } from './package-macos.mjs'

const [releaseArgument, sourceArgument, version] = process.argv.slice(2)
assert(process.platform === 'darwin', 'DMG/ZIP checks require macOS')
assert(releaseArgument && sourceArgument && /^\d+\.\d+\.\d+$/.test(version), 'Usage: node scripts/smoke-macos-formats.mjs <release-dir> <built-source-dir> <version>')
const release = path.resolve(releaseArgument)
const source = path.resolve(sourceArgument)
const scripts = path.dirname(fileURLToPath(import.meta.url))
const root = await mkdtemp(path.join(os.tmpdir(), 'plancia-mac-formats-'))
// Exercise the ~ found in Windows portable extraction paths such as RUNNER~1.
const extracted = path.join(root, 'zip~1')
const mount = path.join(root, 'dmg')
await mkdir(extracted); await mkdir(mount)
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', timeout: 180000, killSignal: 'SIGTERM' })
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} failed (${code})`)))
  })
}
async function inspectAndSmoke(directory, format) {
  const app = discoverMacApp(directory)
  assertReleaseFuses(await readFuseStates(app.executable))
  await run(process.execPath, [path.join(scripts, 'inspect-package.mjs'), app.resources, source, version])
  await run(process.execPath, [path.join(scripts, 'smoke-package.mjs'), app.executable, version, 'release'])
  console.log(JSON.stringify({ format, version, inspectionAndSmoke: 'passed' }))
}
let mounted = false
try {
  await run('ditto', ['-x', '-k', path.join(release, `PlanciaComandi-mac-${version}-arm64.zip`), extracted])
  await inspectAndSmoke(extracted, 'zip')
  await run('hdiutil', ['attach', path.join(release, `PlanciaComandi-mac-${version}-arm64.dmg`), '-readonly', '-nobrowse', '-mountpoint', mount])
  mounted = true
  await inspectAndSmoke(mount, 'dmg-readonly')
} finally {
  if (mounted) await run('hdiutil', ['detach', mount])
  console.log(`Mac format test files retained at ${root}`)
}
