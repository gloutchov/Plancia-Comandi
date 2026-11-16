import { createHash } from 'node:crypto'
import { cp, readFile } from 'node:fs/promises'
import path from 'node:path'
import { FuseState, FuseV1Options, FuseVersion, flipFuses, getCurrentFuseWire } from '@electron/fuses'

export const executableName = 'plancia-comandi'
const sentinel = Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX')

// Electron 45.3.2 carries nine fuses. @electron/fuses 1.8.0, which
// electron-builder 26.18.0 imports, stops at eight, so the flip lives here.
export function releaseFuseConfig() {
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

export function decidedFuseStates() {
  const config = releaseFuseConfig()
  const states = {}
  for (let index = 0; index <= FuseV1Options.WasmTrapHandlers; index += 1) {
    states[index] = config[index] ? FuseState.ENABLE : FuseState.DISABLE
  }
  return states
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

export async function copyOpenFuseTwin(appOutDir) {
  const twin = twinDirectory(appOutDir)
  await cp(appOutDir, twin, { recursive: true, errorOnExist: true, force: false })
  return twin
}

export async function applyReleaseFuses(target) {
  await flipFuses(target, releaseFuseConfig())
  return readFuseStates(target)
}

export async function readFuseStates(target) {
  const wire = await getCurrentFuseWire(target)
  const states = {}
  for (const key of Object.keys(wire)) {
    if (key === 'version') continue
    states[Number(key)] = wire[key]
  }
  return states
}

export function assertReleaseFuses(states) {
  const expected = decidedFuseStates()
  for (const [index, state] of Object.entries(expected)) {
    if (states[Number(index)] !== state) {
      throw new Error(`Fuse ${FuseV1Options[index]} is ${states[Number(index)]}, expected ${state}`)
    }
  }
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
