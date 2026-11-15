import fs from 'node:fs'
import path from 'node:path'
import { openPrivate, atomicPrivateWrite, preserveSettings } from './privateFile'
import { reportDiagnostic } from './diagnostics'
import type { SettingsWarning } from '../src/shared/types'

type ReadResult =
  | { kind: 'valid'; value: Record<string, unknown> }
  | { kind: 'missing' }
  | { kind: 'oversized' }
  | { kind: 'invalid'; bytes: Buffer }
  | { kind: 'unreadable'; error: unknown }

export function readSettingsFile(file: string, maxBytes: number): ReadResult {
  let fd: number | undefined
  try {
    fd = openPrivate(file, fs.constants.O_RDONLY)
    if (fs.fstatSync(fd).size > maxBytes) return { kind: 'oversized' }
    const buffer = Buffer.alloc(maxBytes + 1)
    let length = 0
    while (length < buffer.length) {
      const count = fs.readSync(fd, buffer, length, buffer.length - length, null)
      if (!count) break
      length += count
    }
    if (length > maxBytes) return { kind: 'oversized' }
    const bytes = buffer.subarray(0, length)
    try {
      const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      if (value && typeof value === 'object' && !Array.isArray(value)) return { kind: 'valid', value: value as Record<string, unknown> }
    } catch { /* Preserve invalid JSON without logging its contents. */ }
    return { kind: 'invalid', bytes }
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? { kind: 'missing' } : { kind: 'unreadable', error }
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd) } catch { /* best effort */ } }
  }
}

export class SettingsFile {
  readonly file: string
  warning: SettingsWarning | null = null
  migrationPending = false
  private blocked = false

  constructor(private options: { userData: string; appData: string; maxBytes: number }) {
    this.file = path.join(options.userData, 'settings.json')
  }

  read(): Record<string, unknown> | null {
    let source = this.file
    let result = readSettingsFile(source, this.options.maxBytes)
    if (result.kind === 'missing') {
      for (const name of ['Molo', 'molo']) {
        const legacy = path.join(this.options.appData, name, 'settings.json')
        if (legacy === this.file) continue
        const candidate = readSettingsFile(legacy, this.options.maxBytes)
        if (candidate.kind !== 'missing') { source = legacy; result = candidate; break }
      }
    }
    if (result.kind === 'valid') {
      this.migrationPending = source !== this.file
      return result.value
    }
    if (result.kind === 'missing') return null
    if (result.kind === 'invalid' || result.kind === 'oversized') {
      reportDiagnostic(result.kind === 'invalid' ? 'settings-invalid' : 'settings-oversized')
      try {
        if (source !== this.file && result.kind === 'oversized') throw new Error('Legacy settings exceed limit')
        preserveSettings(this.file, source, source !== this.file && result.kind === 'invalid' ? result.bytes : undefined)
        this.warning = 'recovered'
        return null
      } catch (error) { reportDiagnostic('settings-backup-failed', error) }
    } else { reportDiagnostic('settings-read-failed', result.error) }
    // A file we could not read or preserve must never be overwritten by defaults.
    this.blocked = true
    this.warning = 'read-blocked'
    return null
  }

  write(body: string): boolean {
    if (this.blocked) return false
    try {
      if (Buffer.byteLength(body) > this.options.maxBytes) throw Object.assign(new Error('Settings exceed limit'), { code: 'EINVAL' })
      atomicPrivateWrite(this.file, body)
      this.migrationPending = false
      this.warning = null
      return true
    } catch (error) {
      reportDiagnostic('settings-write-failed', error)
      if (this.migrationPending) reportDiagnostic('settings-migration-failed', error)
      this.warning = 'write-failed'
      return false
    }
  }
}
