import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const site = path.join(root, 'docs')
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8')
const context = vm.createContext({ window: {} })
vm.runInContext(fs.readFileSync(path.join(site, 'i18n.js'), 'utf8'), context)
const translations = context.window.planciaSiteTranslations
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
for (const name of ['site.js', 'preferences.js', 'i18n.js', 'releases.js']) {
  const source = fs.readFileSync(path.join(site, name), 'utf8')
  new vm.Script(source, { filename: name })
  assert(!/\beval\s*\(|\binnerHTML\b/.test(source), `${name}: unexpected HTML execution`)
  if (name !== 'releases.js') assert(!/\bfetch\s*\(/.test(source), `${name}: unexpected remote request`)
  for (const [, id] of source.matchAll(/document\.querySelector\(['"]#([^'"]+)['"]\)/g)) assert(ids.includes(id), `${name}: missing UI element #${id}`)
}
assert.match(html, /<script defer src="\.\/i18n\.js"><\/script>\s*<script defer src="\.\/releases\.js"><\/script>\s*<script defer src="\.\/site\.js"><\/script>/, 'Load dictionaries and release state before controls, including file previews')
assert(!/\bon\w+\s*=|<script\b(?![^>]*\bsrc=)/i.test(html), 'Unexpected inline script or handler')
assert.equal(/connect-src ([^;"\n]+)/.exec(html)?.[1], 'https://api.github.com', 'Allow only the public GitHub API for release metadata')
assert(html.includes("script-src 'self'"))
assert(fs.existsSync(path.join(site, '.nojekyll')))
const cnamePath = path.join(site, 'CNAME')
const cname = fs.existsSync(cnamePath) ? fs.readFileSync(cnamePath, 'utf8').trim() : null
if (cname !== null) assert.match(cname, /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i, 'Invalid CNAME hostname')
const publication = cname ? `https://${cname}/` : 'https://gloutchov.github.io/Plancia-Comandi/'
assert.equal(/<link rel="canonical" href="([^"]+)"/.exec(html)?.[1], publication, 'Canonical differs from the publishing host')
assert.equal(/<meta property="og:url" content="([^"]+)"/.exec(html)?.[1], publication, 'Open Graph URL differs from canonical')
assert.equal(/<meta property="og:image" content="([^"]+)"/.exec(html)?.[1], new URL('./screenshots/plancia-dark-en.png', publication).href, 'Open Graph image differs from the publishing host')
for (const locale of ['it', 'en']) {
  const alternate = new RegExp(`<link rel="alternate" hreflang="${locale}" href="([^"]+)"`).exec(html)?.[1]
  assert.equal(alternate, `${publication}?lang=${locale}`, `${locale}: alternate differs from the publishing host`)
}
for (const name of ['icon.png', 'icon.ico']) assert.deepEqual(fs.readFileSync(path.join(site, 'assets', name)), fs.readFileSync(path.join(root, 'build', name)))
for (const locale of ['it', 'en']) for (const view of ['dark', 'light', 'settings']) assert(fs.statSync(path.join(site, 'screenshots', `plancia-${view}${locale === 'en' ? '-en' : ''}.png`)).isFile())

const release = /data-release-source="([^"]+)"/.exec(html)?.[1]
assert.equal(release, 'github-latest')
const latest = 'https://github.com/gloutchov/Plancia-Comandi/releases/latest'
const downloads = [...html.matchAll(/href="([^"]+)" data-download="([^"]+)"/g)]
assert.equal(downloads.length, 6)
assert.deepEqual(downloads.map(match => match[2]).sort(), ['macChecksums', 'macDmg', 'macZip', 'windowsChecksums', 'windowsPortable', 'windowsSetup'].sort())
for (const [, url] of downloads) assert.equal(url, latest, 'No-JavaScript fallback must follow latest')
assert(!/releases\/(?:tag|download)\/v\d/.test(html), 'Landing must not pin a release')
assert(html.includes(`class="release-link" href="${latest}"`))
console.log(JSON.stringify({ site: 'passed', release, publication, translationKeys: keys.length, locales: 2, localResources, screenshots: 6, downloadLinks: downloads.length, checks: ['relative Pages paths', 'anchors', 'classic script syntax and order', 'UI element references', 'local scripts/styles', 'GitHub-only metadata CSP', 'latest release fallback', 'no inline handlers', 'publication metadata', 'canonical icons', 'IT/EN parity'] }))
