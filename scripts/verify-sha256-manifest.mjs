import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { assetDigestMatches, manifestLine, sha256File } from './electron-fuses.mjs'

const manifestPath = process.argv[2]
const directory = process.argv[3]
assert(manifestPath && directory, 'Usage: node scripts/verify-sha256-manifest.mjs <manifest> <directory>')
const manifest = await readFile(manifestPath, 'utf8')
const lines = manifest.split(/\r?\n/).filter(line => line.length > 0)
assert(lines.length > 0, 'SHA-256 manifest is empty')
const present = new Set(await readdir(directory))
for (const line of lines) {
  const match = /^([0-9a-f]{64})  (\S+)$/.exec(line)
  assert(match, 'SHA-256 manifest line is not hash, two spaces, name')
  const [, hash, name] = match
  assert(present.has(name), 'Manifest names a file that is not in the directory')
  const actual = await sha256File(path.join(directory, name))
  assert.equal(manifestLine(actual, name), line)
  assert.equal(assetDigestMatches(actual, hash), true)
}
console.log(JSON.stringify({ manifest: 'bound', files: lines.length }))
