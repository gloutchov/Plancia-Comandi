import path from 'node:path'
import { prepareOpenFuseTwin } from './electron-fuses.mjs'

const finalDir = process.argv[2]
if (!finalDir) {
  console.error('Usage: node scripts/prepare-open-fuse-twin.mjs <final-unpacked-directory>')
  process.exit(1)
}
const twin = await prepareOpenFuseTwin(path.resolve(finalDir))
console.log(JSON.stringify({ prepared: path.basename(twin) }))
