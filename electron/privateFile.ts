import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

/** The parent is the trusted Electron profile, never a renderer-supplied path. */
export function regularFileOrMissing(file: string): fs.Stats | null {
  try {
    const stat = fs.lstatSync(file)
    if (!stat.isFile() || stat.isSymbolicLink()) throw Object.assign(new Error('Unsafe file'), { code: 'ELOOP' })
    return stat
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export function openPrivate(file: string, flags: number): number {
  regularFileOrMissing(file)
  const noFollow = process.platform === 'win32' ? 0 : fs.constants.O_NOFOLLOW
  const fd = fs.openSync(file, flags | noFollow, 0o600)
  try {
    if (!fs.fstatSync(fd).isFile()) throw Object.assign(new Error('Unsafe file'), { code: 'ELOOP' })
    return fd
  } catch (error) {
    fs.closeSync(fd)
    throw error
  }
}

export function privateDirectory(file: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
}

/** Remove only the unique file reserved by this operation, never the target. */
function removeOwnTemporary(file: string): void {
  try { fs.unlinkSync(file) } catch { /* A failed cleanup must not mask the original failure. */ }
}

export function atomicPrivateWrite(file: string, body: string): void {
  privateDirectory(file)
  regularFileOrMissing(file)
  const temporary = file + '.tmp-' + randomUUID()
  let fd: number | undefined
  let reserved = false
  try {
    fd = fs.openSync(temporary, 'wx', 0o600)
    reserved = true
    fs.writeFileSync(fd, body, 'utf8')
    fs.fsyncSync(fd)
    fs.closeSync(fd)
    fd = undefined
    regularFileOrMissing(file)
    // Same-directory replacement; never unlink the last configuration first.
    fs.renameSync(temporary, file)
    reserved = false
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd) } catch { /* best effort */ } }
    if (reserved) removeOwnTemporary(temporary)
  }
}

/** Reserve .bak exclusively. Older backups and links are never overwritten. */
export function preserveSettings(file: string, source: string, bytes?: Buffer): void {
  privateDirectory(file)
  let backup = file + '.bak'
  let fd: number
  try { fd = fs.openSync(backup, 'wx', 0o600) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    backup = file + '.' + randomUUID() + '.bak'
    fd = fs.openSync(backup, 'wx', 0o600)
  }
  let complete = false
  let closed = false
  try {
    if (bytes) {
      // A bounded legacy snapshot: preserve the legacy file in place as well.
      fs.writeFileSync(fd, bytes)
      fs.fsyncSync(fd)
    }
    fs.closeSync(fd)
    closed = true
    if (!bytes) {
      regularFileOrMissing(source)
      // Quarantine by rename, so oversized files never need reading or copying.
      fs.renameSync(source, backup)
      complete = true
      if (process.platform !== 'win32') fs.chmodSync(backup, 0o600)
    }
    complete = true
  } finally {
    if (!closed) { try { fs.closeSync(fd) } catch { /* best effort */ } }
    if (!complete) removeOwnTemporary(backup)
  }
}
