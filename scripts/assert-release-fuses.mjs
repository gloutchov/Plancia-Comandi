import path from 'node:path'
import { readFile, rm } from 'node:fs/promises'
import { assertReleaseFuses, hasFuseSentinel, portableFuseDecision, readFuseStates } from './electron-fuses.mjs'
import { extractWindowsElectronExe } from './windows-package-exe.mjs'

const executable = path.resolve(process.argv[2] ?? '')
if (!process.argv[2]) {
  console.error('Usage: node scripts/assert-release-fuses.mjs <executable>')
  process.exit(1)
}
const baseName = path.basename(executable)
const direct = hasFuseSentinel(await readFile(executable))
let cleanup = null
let target = executable
let nestedSentinel = false
if (!direct && /-portable\.exe$/i.test(baseName)) {
  const extracted = await extractWindowsElectronExe(executable)
  cleanup = extracted.dir
  target = extracted.exe
  nestedSentinel = hasFuseSentinel(await readFile(target))
}
const source = portableFuseDecision({ baseName, hasSentinel: direct, nestedSentinel })
try {
  assertReleaseFuses(await readFuseStates(target))
  console.log(JSON.stringify({ fuses: 'release', executable: path.basename(target), source }))
} finally {
  if (cleanup) await rm(cleanup, { recursive: true, force: true })
}
