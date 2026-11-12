import { createRequire } from 'node:module'
import path from 'node:path'
import { macPackageOptions } from './package-macos.mjs'

const require = createRequire(path.join(process.cwd(), 'package.json'))
let build
try {
  ;({ build } = require('electron-builder'))
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error)
  console.error(`electron-builder is not installed in ${process.cwd()}: ${detail}`)
  process.exit(1)
}

build(macPackageOptions()).catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exit(1)
})
