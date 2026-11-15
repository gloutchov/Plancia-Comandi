import fs from 'node:fs'
import path from 'node:path'
import { openPrivate, privateDirectory, regularFileOrMissing } from './privateFile'

export type DiagnosticEvent =
  | 'settings-invalid' | 'settings-oversized' | 'settings-read-failed'
  | 'settings-backup-failed' | 'settings-write-failed' | 'settings-migration-failed'
  | 'pty-load-failed' | 'pty-spawn-failed' | 'pty-write-failed' | 'pty-resize-failed'
  | 'screen-load-failed' | 'process-snapshot-failed' | 'preload-failed' | 'startup-failed' | 'ipc-failed'

const CODES = new Set(['ENOENT', 'EACCES', 'EPERM', 'ENOSPC', 'EIO', 'EBUSY', 'EEXIST', 'ENOTDIR',
  'EISDIR', 'ELOOP', 'EMFILE', 'ENFILE', 'EINVAL', 'ERR_DLOPEN_FAILED', 'MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'])
const OPERATIONS = new Set(['open', 'read', 'write', 'rename', 'mkdir', 'copyfile', 'fsync', 'close', 'spawn'])

export function diagnosticEntry(event: DiagnosticEvent, error?: unknown): string {
  let code: unknown
  let operation: unknown
  try {
    if (error && typeof error === 'object') {
      code = (error as NodeJS.ErrnoException).code
      operation = (error as NodeJS.ErrnoException).syscall
    }
  } catch { /* Never inspect message, stack, environment, paths or arbitrary error fields. */ }
  return JSON.stringify({ at: new Date().toISOString(), event,
    code: typeof code === 'string' && CODES.has(code) ? code : 'UNKNOWN',
    ...(typeof operation === 'string' && OPERATIONS.has(operation) ? { operation } : {}),
  })
}

type Reporter = (event: DiagnosticEvent, error?: unknown) => void
let reporter: Reporter = (event, error) => console.error(diagnosticEntry(event, error))

export function reportDiagnostic(event: DiagnosticEvent, error?: unknown): void {
  try { reporter(event, error) } catch { /* Diagnostics must never break app operations. */ }
}

/** Catch sync/async native failures before Electron can serialize their message. */
export function protectMainEffect(action: () => unknown, fallback: unknown): unknown {
  try {
    const result = action()
    if (result instanceof Promise) return result.catch((error: unknown) => {
      reportDiagnostic('ipc-failed', error)
      return fallback
    })
    return result
  } catch (error) {
    reportDiagnostic('ipc-failed', error)
    return fallback
  }
}

/** Local metadata only. Two files, each bounded by maxBytes; no IPC file reader. */
export function configureDiagnostics(userData: string, maxBytes: number): void {
  const file = path.join(userData, 'diagnostics.jsonl')
  reporter = (event, error) => {
    const line = diagnosticEntry(event, error) + '\n'
    let fd: number | undefined
    try {
      privateDirectory(file)
      const stat = regularFileOrMissing(file)
      if (stat && stat.size + Buffer.byteLength(line) > maxBytes) {
        const previous = file + '.1'
        regularFileOrMissing(previous)
        if (stat.size <= maxBytes) fs.renameSync(file, previous)
        else {
          // An externally enlarged managed log is reset without reading it.
          fd = openPrivate(file, fs.constants.O_WRONLY)
          fs.ftruncateSync(fd, 0)
          fs.closeSync(fd)
          fd = undefined
        }
      }
      fd = openPrivate(file, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT)
      if (process.platform !== 'win32') fs.fchmodSync(fd, 0o600)
      fs.writeFileSync(fd, line, 'utf8')
    } catch {
      // The fallback is the same allowlisted metadata, never the logger's error.
      console.error(line.trimEnd())
    } finally {
      if (fd !== undefined) { try { fs.closeSync(fd) } catch { /* best effort */ } }
    }
  }
}
