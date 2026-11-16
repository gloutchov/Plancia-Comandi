import { createHash } from 'node:crypto'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { resolveAppPackageJson } from './electron-fuses.mjs'

const APP_ASAR = 'resources\\app.asar'

function appRequire() {
  return createRequire(resolveAppPackageJson())
}

export function headerSha256(headerString) {
  return createHash('sha256').update(headerString).digest('hex')
}

function asarKey(file) {
  return String(file ?? '').replaceAll('/', '\\').toLowerCase()
}

export function integrityFromEntries(entries, headerString) {
  const computed = headerString == null ? null : headerSha256(headerString)
  const list = Array.isArray(entries) ? entries : []
  const entry = list.find((item) => String(item?.type).toLowerCase() === 'integrity' && String(item?.id).toLowerCase() === 'electronasar')
  if (!entry) {
    return { present: false, content: null, declared: null, computed, matches: false }
  }
  const text = Buffer.from(entry.bin ?? []).toString('utf8')
  let content = null
  let parseError = null
  try { content = JSON.parse(text) } catch (error) { parseError = String(error.message || error).slice(0, 200) }
  const row = Array.isArray(content) ? content.find((item) => asarKey(item?.file) === APP_ASAR) : null
  const declared = row?.value == null ? null : String(row.value).toLowerCase()
  return {
    present: true,
    content,
    parseError,
    file: row?.file ?? null,
    alg: row?.alg ?? null,
    declared,
    computed,
    matches: declared != null && computed != null && declared === computed,
  }
}

export async function asarHeaderString(asarPath) {
  await access(asarPath)
  const { headerString } = appRequire()('@electron/asar').getRawHeader(asarPath)
  return headerString
}

export async function readExecutableIntegrity(exePath) {
  const asarPath = path.join(path.dirname(exePath), 'resources', 'app.asar')
  let headerString = null
  let asarError = null
  try { headerString = await asarHeaderString(asarPath) } catch (error) { asarError = String(error.message || error).slice(0, 300) }
  let entries = null
  let resourceError = null
  try {
    const exe = await readFile(exePath)
    const { NtExecutable, NtExecutableResource } = appRequire()('resedit')
    const resource = NtExecutableResource.from(NtExecutable.from(exe))
    entries = resource.entries
  } catch (error) {
    resourceError = String(error.message || error).slice(0, 300)
  }
  return {
    exe: path.basename(exePath),
    asar: asarError ? null : 'resources/app.asar',
    asarError,
    resourceError,
    ...integrityFromEntries(entries, headerString),
  }
}
