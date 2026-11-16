import path from 'node:path'
import { assertReleaseFuses, readFuseStates } from './electron-fuses.mjs'

const executable = process.argv[2]
if (!executable) {
  console.error('Usage: node scripts/assert-release-fuses.mjs <executable>')
  process.exit(1)
}
assertReleaseFuses(await readFuseStates(path.resolve(executable)))
console.log(JSON.stringify({ fuses: 'release', executable: path.basename(executable) }))
