import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { archiveEntryPath, unexpectedPackageEntry } from './archive-path.mjs'
import { assertConptyHostFiles, packageNeedsConptyHostCheck } from './conpty-host-files.mjs'

const [resourcesArgument, sourceArgument, version] = process.argv.slice(2)
assert(resourcesArgument && sourceArgument && version, 'Usage: node scripts/inspect-package.mjs <resources-directory> <built-source-directory> <version>')
const resources = path.resolve(resourcesArgument)
const source = path.resolve(sourceArgument)
const require = createRequire(path.join(source, 'package.json'))
const asar = require('@electron/asar')
const developmentPackages = Object.keys(JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8')).devDependencies ?? {})
const archive = path.join(resources, 'app.asar')
const entries = asar.listPackage(archive)
const problem = unexpectedPackageEntry(entries, developmentPackages)
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
const buildConfig = require('json5').parse(fs.readFileSync(path.join(source, 'electron-builder.json5'), 'utf8'))
const iconAssets = (buildConfig.files ?? []).filter(entry => typeof entry === 'string' && /^build\/icon\.(png|ico)$/.test(entry))
for (const relative of iconAssets) {
  assert.deepEqual(asar.extractFile(archive, relative), fs.readFileSync(path.join(source, relative)), `Packaged icon differs: ${relative}`)
}
const [major, minor, patch] = version.split('.').map(Number)
if (packageNeedsConptyHostCheck(resources) && (major > 0 || minor > 3 || (minor === 3 && patch >= 19))) {
  assert.deepEqual(fs.readFileSync(path.join(resources, 'icon.ico')), fs.readFileSync(path.join(source, 'build', 'icon.ico')), 'Windows taskbar ICO differs or is missing outside ASAR')
}
assert.deepEqual(fs.readFileSync(path.join(resources, 'config', 'app.config.json')), fs.readFileSync(path.join(source, 'config', 'app.config.json')))
assert(fs.existsSync(path.join(resources, 'app.asar.unpacked', 'node_modules', 'node-pty')), 'Native PTY is not unpacked')
const conptyHost = packageNeedsConptyHostCheck(resources)
  ? assertConptyHostFiles(resources, source)
  : { skipped: 'not-windows' }
// Check loose resources too: a private file outside app.asar is still shipped.
const loose = []
function inspectLoose(directory, prefix = '') {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    assert(!item.isSymbolicLink(), 'Unexpected resource symlink')
    const name = `${prefix}/${item.name}`
    if (item.isDirectory()) inspectLoose(path.join(directory, item.name), name)
    else loose.push(name.replace(/^\/app\.asar\.unpacked/, ''))
  }
}
inspectLoose(resources)
const looseProblem = unexpectedPackageEntry(loose, developmentPackages)
assert.equal(looseProblem, null, looseProblem ?? undefined)
console.log(JSON.stringify({ inspection: 'passed', version, comparedBundles: compared, iconAssets, entries: entries.length, looseFiles: loose.length, developmentPackagesExcluded: developmentPackages.length, conptyHost }))
