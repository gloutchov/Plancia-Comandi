import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { cp, readdir, readFile, readlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

let fusesModule

export function resolveAppPackageJson(start = process.cwd()) {
  const seeds = [start, path.dirname(fileURLToPath(import.meta.url))]
  const seen = new Set()
  for (const seed of seeds) {
    let dir = path.resolve(seed)
    for (let depth = 0; depth < 8; depth += 1) {
      if (seen.has(dir)) break
      seen.add(dir)
      for (const file of [path.join(dir, 'package.json'), path.join(dir, 'app', 'package.json')]) {
        if (!existsSync(file)) continue
        const pkg = JSON.parse(readFileSync(file, 'utf8'))
        const deps = { ...pkg.dependencies, ...pkg.devDependencies }
        if (deps['@electron/fuses']) return file
      }
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  throw new Error('Cannot resolve @electron/fuses from an app package.json')
}

export function fileImportHref(filePath) {
  const href = pathToFileURL(filePath).href
  if (!href.startsWith('file:')) throw new Error(`import() requires a file URL, received ${href}`)
  return href
}

// Node's pathToFileURL follows the host platform. This reproduces the Windows
// rule so a Linux test rejects a raw `D:` specifier before it reaches import().
export function fileImportHrefWin32(filePath) {
  const resolved = path.win32.resolve(filePath)
  let href
  if (resolved.startsWith('\\\\')) {
    const [host, ...rest] = resolved.slice(2).split('\\')
    href = new URL(`file://${host}/${rest.join('/')}`).href
  } else if (/^[A-Za-z]:\\/.test(resolved)) {
    href = new URL(`/${resolved.replaceAll('\\', '/')}`, 'file://').href
  } else {
    throw new Error(`Not a Windows path: ${resolved}`)
  }
  if (!href.startsWith('file:')) throw new Error(`import() requires a file URL, received ${href}`)
  return href
}

export function loadFuses(start) {
  if (!fusesModule) fusesModule = createRequire(resolveAppPackageJson(start))('@electron/fuses')
  return fusesModule
}

export const executableName = 'plancia-comandi'
const sentinel = Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX')

// Electron 45.3.2 carries nine fuses. @electron/fuses 1.8.0, which
// electron-builder 26.18.0 imports, stops at eight, so the flip lives here.
export function releaseFuseConfig() {
  const { FuseVersion, FuseV1Options } = loadFuses()
  return {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: true,
    strictlyRequireAllFuses: true,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: true,
    [FuseV1Options.WasmTrapHandlers]: true,
  }
}

function fuseStatesFrom(config) {
  const { FuseState, FuseV1Options } = loadFuses()
  const states = {}
  for (let index = 0; index <= FuseV1Options.WasmTrapHandlers; index += 1) {
    states[index] = config[index] ? FuseState.ENABLE : FuseState.DISABLE
  }
  return states
}

export function decidedFuseStates() {
  return fuseStatesFrom(releaseFuseConfig())
}

// Wire read from the unpacked Electron 45.3.2 binary before any flip.
export function defaultFuseConfig() {
  const { FuseVersion, FuseV1Options } = loadFuses()
  return {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: true,
    strictlyRequireAllFuses: true,
    [FuseV1Options.RunAsNode]: true,
    [FuseV1Options.EnableCookieEncryption]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: true,
    [FuseV1Options.EnableNodeCliInspectArguments]: true,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
    [FuseV1Options.OnlyLoadAppFromAsar]: false,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: true,
    [FuseV1Options.WasmTrapHandlers]: true,
  }
}

export function defaultFuseStates() {
  return fuseStatesFrom(defaultFuseConfig())
}

export function twinDirectory(appOutDir) {
  return `${appOutDir}-open-fuses`
}

export function fuseTarget(appOutDir, platform, entries) {
  if (platform === 'darwin' || platform === 'mas') {
    const apps = entries.filter(name => name.endsWith('.app'))
    if (apps.length !== 1) throw new Error('Expected one macOS app bundle before flipping fuses')
    return path.join(appOutDir, apps[0])
  }
  const suffix = platform === 'win32' ? '.exe' : ''
  return path.join(appOutDir, `${executableName}${suffix}`)
}

function runTool(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk })
    child.stderr.on('data', (chunk) => { output += chunk })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolve(output)
      else reject(new Error(`${command} exited ${code}: ${output.slice(-800)}`))
    })
  })
}

// Node's fs.cp rewrites a relative symlink to an absolute path in the source.
// The twin would then load the release framework after the fuse flip.
export async function copyBundle(src, dest) {
  if (process.platform === 'darwin') await runTool('ditto', [src, dest])
  else await cp(src, dest, { recursive: true, verbatimSymlinks: true, dereference: false, errorOnExist: true, force: false })
  return dest
}

export async function copyOpenFuseTwin(appOutDir) {
  return copyBundle(appOutDir, twinDirectory(appOutDir))
}

export async function symlinksOutside(root) {
  const outside = []
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isSymbolicLink()) {
        const target = await readlink(full)
        const resolved = path.resolve(path.dirname(full), target)
        const relative = path.relative(root, resolved)
        if (relative.startsWith('..') || path.isAbsolute(relative)) outside.push({ link: path.relative(root, full), target })
      } else if (entry.isDirectory()) await walk(full)
    }
  }
  await walk(root)
  return outside
}

export async function frameworkLinks(root) {
  const links = []
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isSymbolicLink() && full.includes(`${path.sep}Electron Framework.framework${path.sep}`)) {
        links.push({ link: path.relative(root, full), target: await readlink(full) })
      } else if (entry.isDirectory()) await walk(full)
    }
  }
  await walk(root)
  return links
}

export function assertTwinStillOpen(states) {
  const { FuseState, FuseV1Options } = loadFuses()
  if (states[FuseV1Options.RunAsNode] !== FuseState.ENABLE) throw new Error('Open-fuse twin has runAsNode disabled')
  if (states[FuseV1Options.EnableNodeCliInspectArguments] !== FuseState.ENABLE) throw new Error('Open-fuse twin has nodeCliInspect disabled')
}

export function assertDefaultFuses(states) {
  const expected = defaultFuseStates()
  const { FuseV1Options } = loadFuses()
  for (const [index, state] of Object.entries(expected)) {
    if (states[Number(index)] !== state) throw new Error(`Open-fuse twin ${FuseV1Options[index]} is ${states[Number(index)]}, expected default ${state}`)
  }
}

export function appBundlePath(executable) {
  const parts = String(executable).split(path.sep)
  const index = parts.findLastIndex(part => part.endsWith('.app'))
  if (index < 0) return null
  return parts.slice(0, index + 1).join(path.sep)
}

export function pathToFuseFile(target) {
  return loadFuses().pathToFuseFile(target)
}

export async function applyReleaseFuses(target) {
  await loadFuses().flipFuses(target, releaseFuseConfig())
  return readFuseStates(target)
}

export async function readFuseStates(target) {
  const wire = await loadFuses().getCurrentFuseWire(target)
  const states = {}
  for (const key of Object.keys(wire)) {
    if (key === 'version') continue
    states[Number(key)] = wire[key]
  }
  return states
}

export function assertReleaseFuses(states) {
  const { FuseV1Options } = loadFuses()
  const expected = decidedFuseStates()
  for (const [index, state] of Object.entries(expected)) {
    if (states[Number(index)] !== state) {
      throw new Error(`Fuse ${FuseV1Options[index]} is ${states[Number(index)]}, expected ${state}`)
    }
  }
}

export async function prepareOpenFuseTwin(finalDir) {
  const twin = await copyOpenFuseTwin(finalDir)
  const outside = await symlinksOutside(twin)
  const links = await frameworkLinks(twin)
  console.log(JSON.stringify({ twin: path.basename(twin), frameworkLinks: links, symlinksOutside: outside.length }))
  if (outside.length) throw new Error('Open-fuse twin has a symlink that points outside its directory')
  const entries = await readdir(twin)
  const target = fuseTarget(twin, process.platform, entries)
  await loadFuses().flipFuses(target, defaultFuseConfig())
  if (process.platform === 'darwin') {
    const apps = entries.filter(name => name.endsWith('.app'))
    if (apps.length !== 1) throw new Error('Expected one macOS app in the open-fuse twin')
    await runTool('codesign', ['--force', '--deep', '--sign', '-', path.join(twin, apps[0])])
  }
  assertDefaultFuses(await readFuseStates(target))
  return twin
}

export function fuseStateSpans(buffer) {
  const spans = []
  let from = 0
  while (from < buffer.length) {
    const index = buffer.indexOf(sentinel, from)
    if (index < 0) break
    const position = index + sentinel.length
    const length = buffer[position + 1]
    spans.push({ start: position + 2, end: position + 2 + length })
    from = position + 2 + length
  }
  if (spans.length === 0) throw new Error('Electron fuse sentinel was not found')
  return spans
}

export function assertOnlyFuseWireDiffers(openBuffer, releaseBuffer) {
  if (openBuffer.length !== releaseBuffer.length) {
    throw new Error('Open-fuse twin and release binary have different lengths')
  }
  const spans = fuseStateSpans(openBuffer)
  for (let offset = 0; offset < openBuffer.length; offset += 1) {
    if (openBuffer[offset] === releaseBuffer[offset]) continue
    const inside = spans.some(span => offset >= span.start && offset < span.end)
    if (!inside) throw new Error(`Byte ${offset} differs outside the fuse wire`)
  }
}

export async function sha256File(file) {
  const data = await readFile(file)
  return createHash('sha256').update(data).digest('hex')
}

export function manifestLine(hash, name) {
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('SHA-256 must be 64 lowercase hex characters')
  if (name.length === 0 || /[\r\n]/.test(name)) throw new Error('Manifest name must be one line')
  return `${hash}  ${name}`
}

export function assertManifestBinds(manifest, hash, name) {
  const expected = manifestLine(hash, name)
  const lines = manifest.split(/\r?\n/).filter(line => line.length > 0)
  if (!lines.includes(expected)) throw new Error('SHA-256 manifest does not bind the tested file')
}

export function assetDigestMatches(testedHash, assetDigest) {
  return testedHash.toLowerCase() === String(assetDigest).toLowerCase().replace(/^sha256:/, '')
}
