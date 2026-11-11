import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { ClipboardImageConfig } from './appConfig'
import { validateAppConfig } from './appConfig'

export interface ClipboardImageInput {
  png: Buffer
  width: number
  height: number
  config: ClipboardImageConfig
  userDataDir: string
  now?: number
  randomHex?: string
}

function checkedConfig(config: ClipboardImageConfig): ClipboardImageConfig {
  return validateAppConfig({ clipboardImages: config }).clipboardImages
}

export function clipboardImageDirectory(userDataDir: string, directoryName: string): string | null {
  if (!userDataDir || path.isAbsolute(directoryName) || directoryName !== path.basename(directoryName)) return null
  const root = path.resolve(userDataDir)
  const dir = path.resolve(root, directoryName)
  if (dir !== path.join(root, directoryName)) return null
  const relative = path.relative(root, dir)
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null
  return dir
}

function namePattern(prefix: string): RegExp {
  return new RegExp(`^${prefix}-[0-9a-z]+-[0-9a-f]{16}\\.png$`)
}

function tempPattern(prefix: string): RegExp {
  return new RegExp(`^\\.${prefix}-[0-9a-z]+-[0-9a-f]{16}\\.png\\.tmp$`)
}

export function clipboardFilesToDelete(
  files: ReadonlyArray<{ name: string; mtimeMs: number }>,
  config: Pick<ClipboardImageConfig, 'filePrefix' | 'maxKeep' | 'maxAgeHours'>,
  now: number,
): string[] {
  const images = namePattern(config.filePrefix)
  const temps = tempPattern(config.filePrefix)
  const maxAgeMs = config.maxAgeHours * 60 * 60 * 1000
  const doomed = new Set<string>()
  const fresh: Array<{ name: string; mtimeMs: number }> = []
  for (const file of files) {
    if (temps.test(file.name)) {
      if (now - file.mtimeMs > 60 * 60 * 1000) doomed.add(file.name)
      continue
    }
    if (!images.test(file.name)) continue
    if (now - file.mtimeMs > maxAgeMs) doomed.add(file.name)
    else fresh.push(file)
  }
  fresh.sort((a, b) => b.mtimeMs - a.mtimeMs)
  for (const extra of fresh.slice(config.maxKeep)) doomed.add(extra.name)
  return [...doomed]
}

function listFiles(dir: string): Array<{ name: string; mtimeMs: number }> {
  let names: string[]
  try {
    names = fs.readdirSync(dir)
  } catch {
    return []
  }
  const files: Array<{ name: string; mtimeMs: number }> = []
  for (const name of names) {
    if (name !== path.basename(name)) continue
    try {
      const stat = fs.statSync(path.join(dir, name))
      if (stat.isFile()) files.push({ name, mtimeMs: stat.mtimeMs })
    } catch {
      // Skip entries that disappear while cleaning.
    }
  }
  return files
}

export function cleanupClipboardImages(userDataDir: string, config: ClipboardImageConfig, now = Date.now()): void {
  const safe = checkedConfig(config)
  const dir = clipboardImageDirectory(userDataDir, safe.directoryName)
  if (!dir || !fs.existsSync(dir)) return
  for (const name of clipboardFilesToDelete(listFiles(dir), safe, now)) {
    const full = path.join(dir, name)
    if (path.dirname(full) !== dir) continue
    try {
      fs.unlinkSync(full)
    } catch {
      // A file still in use can be removed on a later paste.
    }
  }
}

function restrict(target: string, mode: number): void {
  try {
    fs.chmodSync(target, mode)
  } catch {
    // Windows does not honor POSIX modes; the user-data ACL remains the boundary.
  }
}

/**
 * Writes a generated PNG under the user-data directory. Returns null when the
 * image or the destination is not acceptable. The renderer never chooses the path.
 */
export function saveClipboardImage(input: ClipboardImageInput): string | null {
  const config = checkedConfig(input.config)
  if (input.width < 1 || input.height < 1) return null
  if (input.width > config.maxEdgePx || input.height > config.maxEdgePx) return null
  if (input.png.length < 1 || input.png.length > config.maxBytes) return null
  const dir = clipboardImageDirectory(input.userDataDir, config.directoryName)
  if (!dir) return null
  const hex = input.randomHex && /^[0-9a-f]{16}$/.test(input.randomHex) ? input.randomHex : randomBytes(8).toString('hex')
  const stamp = (input.now ?? Date.now()).toString(36)
  const filename = `${config.filePrefix}-${stamp}-${hex}.png`
  if (!namePattern(config.filePrefix).test(filename)) return null
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    restrict(dir, 0o700)
    cleanupClipboardImages(input.userDataDir, config, input.now ?? Date.now())
    const destination = path.join(dir, filename)
    if (path.dirname(destination) !== dir) return null
    const temporary = path.join(dir, `.${filename}.tmp`)
    fs.writeFileSync(temporary, input.png, { mode: 0o600 })
    restrict(temporary, 0o600)
    fs.renameSync(temporary, destination)
    restrict(destination, 0o600)
    return destination
  } catch {
    return null
  }
}
