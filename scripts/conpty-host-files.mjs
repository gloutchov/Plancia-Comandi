import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

/**
 * The inspector knows a macOS package by its resources directory:
 * `<name>.app/Contents/Resources`. Every other package is identified only by
 * that directory, so the host running the inspection is the target.
 */
export function packageNeedsConptyHostCheck(resourcesDir, platform = process.platform) {
  const normalized = String(resourcesDir).replace(/\\/g, '/')
  if (/(^|\/)[^/]+\.app\/Contents\/Resources\/?$/i.test(normalized)) return false
  return platform === 'win32'
}

function prebuildsDir(sourceRoot) {
  return path.join(sourceRoot, 'node_modules', 'node-pty', 'prebuilds')
}

/**
 * Checkout that contains node_modules. CI runs this script from tooling/scripts
 * with the app checkout at ../../app. A local run from scripts/ uses the parent.
 * PLANCIA_SOURCE_DIR overrides both. The working directory is not used.
 */
export function packageSourceDir(scriptUrl, env = process.env, exists = existsSync) {
  if (typeof env.PLANCIA_SOURCE_DIR === 'string' && env.PLANCIA_SOURCE_DIR.trim()) {
    const dir = path.resolve(env.PLANCIA_SOURCE_DIR)
    if (!exists(prebuildsDir(dir))) throw new Error(`PLANCIA_SOURCE_DIR has no node_modules/node-pty/prebuilds: ${dir}`)
    return dir
  }
  const scriptDir = path.dirname(fileURLToPath(scriptUrl))
  const candidates = [
    path.resolve(scriptDir, '..'),
    path.resolve(scriptDir, '..', '..', 'app'),
  ]
  for (const dir of candidates) {
    if (exists(prebuildsDir(dir))) return dir
  }
  throw new Error(`node_modules/node-pty/prebuilds was not found. Set PLANCIA_SOURCE_DIR to the app checkout. Looked in ${candidates.join(', ')}`)
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
