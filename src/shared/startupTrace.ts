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
  let value = String(text)
  const variants = homes.flatMap(homeVariants).sort((a, b) => b.length - a.length)
  for (const home of variants) value = replaceAllInsensitive(value, home, '<home>')
  value = value.replace(/\\\\[^\s"'<>|]+/g, '<path>')
  value = value.replace(/[A-Za-z]:[\\/][^\s"'<>|]+/g, '<path>')
  value = value.replace(/\/(?:[\w.@+-]+\/)*[\w.@+-]+/g, '<path>')
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
  const detail: Record<string, string | number | boolean | null> = { name: reason.name || 'Error' }
  const errno = reason as NodeJS.ErrnoException
  if (typeof errno.code === 'string') detail.code = errno.code
  if (typeof errno.syscall === 'string') detail.syscall = errno.syscall
  if (reason.message) detail.message = scrubDiagnosticText(reason.message, homes)
  const frames = reducedStack(reason.stack)
  if (frames) detail.stack = frames
  return detail
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

function reducedStack(stack: string | undefined): string | null {
  if (!stack) return null
  const frames: string[] = []
  for (const line of stack.split('\n')) {
    const match = /^\s*at (?:async )?(?:(.+?) )?\(?(.+):(\d+):\d+\)?\s*$/.exec(line)
    if (!match) continue
    const fn = (match[1] || 'anonymous').trim()
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
