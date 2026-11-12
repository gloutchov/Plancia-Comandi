import path from 'node:path'
import { discoverMacApp } from './package-macos.mjs'

const unpackedDir = process.argv[2]
if (!unpackedDir) {
  console.error('Usage: node scripts/mac-unpacked-paths.mjs <mac-arm64-directory>')
  process.exit(1)
}

try {
  console.log(JSON.stringify(discoverMacApp(path.resolve(unpackedDir))))
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
