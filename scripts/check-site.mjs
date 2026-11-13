import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { translations } from '../docs/i18n.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const site = path.join(root, 'docs')
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8')
const keys = Object.keys(translations.it).sort()
assert.deepEqual(Object.keys(translations.en).sort(), keys, 'IT/EN keys differ')
for (const locale of ['it', 'en']) for (const key of keys) assert(translations[locale][key]?.trim(), `${locale}: ${key} is empty`)
for (const match of html.matchAll(/data-(?:copy|label|title)="([^"]+)"/g)) assert(keys.includes(match[1]), `Unknown translation: ${match[1]}`)

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1])
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML ids')
let localResources = 0
for (const [, value] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  if (value.startsWith('https://')) continue
  if (value.startsWith('#')) { assert(ids.includes(value.slice(1)), `Missing anchor: ${value}`); continue }
  assert(value.startsWith('./'), `Resource must be relative to the Pages path: ${value}`)
  const resolved = path.resolve(site, value)
  assert(resolved.startsWith(site + path.sep), `Resource outside site: ${value}`)
  assert(fs.statSync(resolved).isFile(), `Missing resource: ${value}`)
  assert(new URL(value, 'http://127.0.0.1:4174/Plancia-Comandi/').pathname.startsWith('/Plancia-Comandi/'))
  localResources++
}
for (const name of ['site.js', 'preferences.js', 'i18n.js']) {
  const source = fs.readFileSync(path.join(site, name), 'utf8')
  assert(!/\b(?:eval|fetch)\s*\(|\binnerHTML\b/.test(source), `${name}: unexpected remote or HTML execution`)
  for (const [, value] of source.matchAll(/from ['"]([^'"]+)['"]/g)) assert(fs.statSync(path.resolve(site, value)).isFile())
}
assert(!/\bon\w+\s*=|<script\b(?![^>]*\bsrc=)/i.test(html), 'Unexpected inline script or handler')
assert(html.includes("connect-src 'none'"))
assert(html.includes("script-src 'self'"))
assert(fs.existsSync(path.join(site, '.nojekyll')))
for (const name of ['icon.png', 'icon.ico']) assert.deepEqual(fs.readFileSync(path.join(site, 'assets', name)), fs.readFileSync(path.join(root, 'build', name)))
for (const locale of ['it', 'en']) for (const view of ['dark', 'light', 'settings']) assert(fs.statSync(path.join(site, 'screenshots', `plancia-${view}${locale === 'en' ? '-en' : ''}.png`)).isFile())

const release = /data-release="([^"]+)"/.exec(html)?.[1]
assert.match(release, /^\d+\.\d+\.\d+$/)
const downloads = [...html.matchAll(/href="(https:\/\/github\.com\/gloutchov\/Plancia-Comandi\/releases\/download\/[^\"]+)"/g)].map(m => m[1])
assert.equal(downloads.length, 6)
for (const url of downloads) assert(url.includes(`/v${release}/`), 'Release URL version differs')
assert.equal(downloads.filter(url => url.endsWith('.exe')).length, 2)
assert.equal(downloads.filter(url => url.endsWith('.dmg') || url.endsWith('.zip')).length, 2)
assert.equal(downloads.filter(url => /SHA256SUMS-.*\.txt$/.test(url)).length, 2)
console.log(JSON.stringify({ site: 'passed', release, translationKeys: keys.length, locales: 2, localResources, screenshots: 6, downloadLinks: downloads.length, checks: ['relative Pages paths', 'anchors', 'local scripts/styles', 'CSP', 'no inline handlers', 'canonical icons', 'IT/EN parity'] }))
