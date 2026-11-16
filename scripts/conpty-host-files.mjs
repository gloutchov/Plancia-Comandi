import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

export const CONPTY_HOST_FILES = [
  'node_modules/node-pty/prebuilds/win32-x64/conpty/conpty.dll',
  'node_modules/node-pty/prebuilds/win32-x64/conpty/OpenConsole.exe',
]

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function packagedConptyFile(resourcesDir, relative) {
  return path.join(resourcesDir, 'app.asar.unpacked', ...relative.split('/'))
}

export function sourceConptyFile(sourceRoot, relative) {
  return path.join(sourceRoot, ...relative.split('/'))
}

/** Presence and SHA-256 of the unpacked ConPTY host files, compared with the checkout prebuild. */
export function assertConptyHostFiles(resourcesDir, sourceRoot, read = readFileSync) {
  const checked = []
  for (const relative of CONPTY_HOST_FILES) {
    const packaged = read(packagedConptyFile(resourcesDir, relative))
    const source = read(sourceConptyFile(sourceRoot, relative))
    const packagedHash = sha256(packaged)
    const sourceHash = sha256(source)
    if (packagedHash !== sourceHash) throw new Error(`ConPTY host file hash differs: ${relative}`)
    checked.push({ relative, sha256: packagedHash })
  }
  return checked
}
