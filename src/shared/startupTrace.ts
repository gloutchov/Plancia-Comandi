import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const MAX_BYTES = 16_384
const MAX_LINES = 48
const PATH_KEYS = new Set(['userData', 'home', 'appData', 'homeEnv', 'appDataEnv', 'localAppData', 'appPath', 'dirname', 'resourcesPath'])
const TEXT_KEYS = new Map([['message', 500], ['stack', 2000], ['cause', 500]])

export interface StartupTrace {
  event(name: string, detail?: Record<string, string | number | boolean | null>): void
  setQuitReason(reason: string): void
  reason(): string
}

export interface StartupProcessTarget {
  on(event: 'uncaughtException', listener: (error: Error) => void): unknown
  on(event: 'unhandledRejection', listener: (reason: unknown) => void): unknown
}

export function installStartupProcessHandlers(
  env: NodeJS.ProcessEnv,
  trace: StartupTrace | null,
  target: StartupProcessTarget,
): void {
  if (env.PLANCIA_DIAG_STARTUP !== '1' || !trace) return
  const homes = diagnosticHomes(env)
  target.on('uncaughtException', (error) => {
    trace.event('uncaughtException', startupProcessDetail(error, homes))
  })
  target.on('unhandledRejection', (reason) => {
    trace.event('unhandledRejection', startupProcessDetail(reason, homes))
  })
}

export function diagnosticHomes(env: NodeJS.ProcessEnv = process.env): string[] {
  const found = [env.HOME, env.USERPROFILE, os.homedir()]
  return found.filter((value): value is string => typeof value === 'string' && value.length > 1)
}

export function scrubDiagnosticText(text: string, homes: readonly string[] = diagnosticHomes()): string {
  let value = String(text).slice(0, 4096)
  value = value.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<url>')
  value = value.replace(/\b[A-Z][A-Z0-9_]{2,}=\S+/g, '<env>')
  value = value.replace(/\b(?:Bearer|Basic)\s+\S+/gi, '<redacted>')
  value = value.replace(/\b[\w.-]*(?:pass|pwd|secret|token|key|auth|cookie)[\w.-]*\s*[=:]\s*\S+/gi, '<redacted>')
  value = value.replace(/[A-Za-z0-9_+/=-]{32,}/g, '<redacted>')
  const variants = homes.flatMap(homeVariants).sort((a, b) => b.length - a.length)
  for (const home of variants) value = replaceAllInsensitive(value, home, '<home>')
  value = value.replace(/[^\s"'<>|]*\\[^\s"'<>|]*/g, '<path>')
  value = value.replace(/~\/[^\s"'<>|:]*/g, '<path>')
  value = value.replace(/\/[^\s"'<>|:]+/g, '<path>')
  return value.slice(0, 200)
}

export function startupProcessDetail(
  reason: unknown,
  homes: readonly string[] = diagnosticHomes(),
): Record<string, string | number | boolean | null> {
  if (!(reason instanceof Error)) {
    const detail: Record<string, string | number | boolean | null> = { name: 'non-error' }
    if (typeof reason === 'string' && reason) detail.message = scrubDiagnosticText(reason, homes)
    return detail
  }
  const detail: Record<string, string | number | boolean | null> = { name: allowedName(reason.name) }
  const errno = reason as NodeJS.ErrnoException
  const code = allowedCode(errno.code)
  const syscall = allowedSyscall(errno.syscall)
  if (code) detail.code = code
  if (syscall) detail.syscall = syscall
  if (reason.message) detail.message = scrubDiagnosticText(reason.message, homes)
  const frames = reducedStack(reason.stack, homes)
  if (frames) detail.stack = frames
  return detail
}

function allowedName(name: string | undefined): string {
  return typeof name === 'string' && /^[A-Za-z][\w.]{0,39}$/.test(name) ? name : 'Error'
}

function allowedCode(code: unknown): string | null {
  return typeof code === 'string' && /^[A-Z0-9_]{1,40}$/.test(code) ? code : null
}

function allowedSyscall(syscall: unknown): string | null {
  return typeof syscall === 'string' && /^[a-z_]{1,24}$/.test(syscall) ? syscall : null
}

function homeVariants(home: string): string[] {
  const trimmed = home.replace(/[\\/]+$/, '')
  if (trimmed.length < 2) return []
  return [...new Set([trimmed, trimmed.replaceAll('\\', '/'), trimmed.replaceAll('/', '\\')])]
}

function replaceAllInsensitive(text: string, needle: string, replacement: string): string {
  const pattern = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(pattern, 'gi'), replacement)
}

function reducedStack(stack: string | undefined, homes: readonly string[]): string | null {
  if (!stack) return null
  const frames: string[] = []
  for (const line of stack.split('\n')) {
    if (line.length > 1000) continue
    const match = /^\s*at (?:async )?(?:(.+?) )?\(?(.+):(\d+):\d+\)?\s*$/.exec(line)
    if (!match) continue
    const fn = scrubDiagnosticText((match[1] || 'anonymous').trim(), homes).slice(0, 80)
    const file = match[2].split(/[/\\]/).pop() || 'unknown'
    frames.push(`${fn} ${file}:${match[3]}`)
    if (frames.length === 8) break
  }
  return frames.length ? frames.join(' | ') : null
}

function detailValue(key: string, value: string | number | boolean | null): string | number | boolean | null | undefined {
  if (typeof value === 'boolean' || value === null) return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return undefined
  if (PATH_KEYS.has(key)) return value.slice(0, 300)
  const textCap = TEXT_KEYS.get(key)
  if (textCap) return value.slice(0, textCap)
  if (/^[A-Za-z0-9_.:-]{1,80}$/.test(value)) return value
  return undefined
}

export function startupFailureDetail(step: string, error: unknown): Record<string, string | number | boolean | null> {
  const detail: Record<string, string | number | boolean | null> = { step, cause: null, code: 'UNKNOWN' }
  if (error instanceof Error) {
    detail.name = error.name || 'Error'
    detail.message = error.message
    if (typeof error.stack === 'string') detail.stack = error.stack
    const cause = error.cause
    if (cause instanceof Error) detail.cause = `${cause.name}: ${cause.message}`
    else if (typeof cause === 'string') detail.cause = cause
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' || typeof code === 'number') detail.code = String(code)
    return detail
  }
  detail.name = 'non-error'
  if (typeof error === 'string') detail.message = error
  return detail
}

export function startupLine(name: string, detail: Record<string, string | number | boolean | null> = {}): string {
  const row: Record<string, string | number | boolean | null> = { at: new Date().toISOString(), event: name.slice(0, 80) }
  for (const [key, value] of Object.entries(detail)) {
    if (!/^[A-Za-z][A-Za-z0-9]{0,40}$/.test(key)) continue
    const safe = detailValue(key, value)
    if (safe !== undefined) row[key] = safe
  }
  return JSON.stringify(row)
}

export function createStartupTrace(dir: string | undefined, write: (line: string) => void = (line) => {
  console.error(line)
}): StartupTrace {
  let reason = 'unspecified'
  let bytes = 0
  let lines = 0
  const file = dir ? path.join(dir, 'startup.jsonl') : null
  const emit = (name: string, detail?: Record<string, string | number | boolean | null>) => {
    if (lines >= MAX_LINES || bytes >= MAX_BYTES) return
    const line = startupLine(name, detail)
    lines += 1
    bytes += Buffer.byteLength(line) + 1
    write(line)
    if (!file) return
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.appendFileSync(file, `${line}\n`, 'utf8')
    } catch { /* stderr already has the line */ }
  }
  return {
    event: emit,
    setQuitReason(next) { reason = next.slice(0, 80) },
    reason: () => reason,
  }
}
