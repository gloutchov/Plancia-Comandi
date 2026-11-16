import path from 'node:path'
import { assertDefaultFuses, assertReleaseFuses, readFuseStates } from './electron-fuses.mjs'

const releaseExecutable = process.argv[2]
const twinExecutable = process.argv[3]
if (!releaseExecutable || !twinExecutable) {
  console.error('Usage: node scripts/check-fuse-wires.mjs <release-executable> <open-fuse-executable>')
  process.exit(1)
}

const release = await readFuseStates(path.resolve(releaseExecutable))
const twin = await readFuseStates(path.resolve(twinExecutable))
assertReleaseFuses(release)
assertDefaultFuses(twin)
console.log(JSON.stringify({ release, twin }))
