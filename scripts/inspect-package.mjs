import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { archiveEntryPath, unexpectedPackageEntry } from './archive-path.mjs'

const [resourcesArgument, sourceArgument, version] = process.argv.slice(2)
assert(resourcesArgument && sourceArgument && version, 'Usage: node scripts/inspect-package.mjs <resources-directory> <built-source-directory> <version>')
const resources = path.resolve(resourcesArgument)
const source = path.resolve(sourceArgument)
const require = createRequire(path.join(source, 'package.json'))
const asar = require('@electron/asar')
const archive = path.join(resources, 'app.asar')
const entries = asar.listPackage(archive)
const problem = unexpectedPackageEntry(entries)
assert.equal(problem, null, problem ?? undefined)
const manifest = JSON.parse(asar.extractFile(archive, 'package.json').toString())
assert.equal(manifest.version, version)
assert.equal(manifest.main, 'dist-electron/main.js')
let compared = 0
function compare(directory) {
  for (const item of fs.readdirSync(path.join(source, directory), { withFileTypes: true })) {
    const relative = archiveEntryPath(path, directory, item.name)
    if (item.isDirectory()) compare(relative)
    else {
      assert.deepEqual(asar.extractFile(archive, relative), fs.readFileSync(path.join(source, relative)), `Bundle differs: ${relative}`)
      compared += 1
    }
  }
}
for (const directory of ['dist', 'dist-electron', 'config']) compare(directory)
assert.deepEqual(fs.readFileSync(path.join(resources, 'config', 'app.config.json')), fs.readFileSync(path.join(source, 'config', 'app.config.json')))
assert(fs.existsSync(path.join(resources, 'app.asar.unpacked', 'node_modules', 'node-pty')), 'Native PTY is not unpacked')
console.log(JSON.stringify({ inspection: 'passed', version, comparedBundles: compared, entries: entries.length }))
