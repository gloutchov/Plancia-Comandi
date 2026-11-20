import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

// Resolve from the source checkout, not the tooling checkout, for old releases.
const file = path.resolve(process.argv[2] ?? 'electron-builder.json5')
const require = createRequire(path.join(path.dirname(file), 'package.json'))
const { parse } = require('json5')
const config = parse(fs.readFileSync(file, 'utf8'))
const name = config.win?.executableName ?? config.executableName ?? config.productName
if (typeof name !== 'string' || !name || /[\\/\r\n]/.test(name)) throw new Error('Invalid configured Windows executable name')
process.stdout.write(`${name}.exe`)
