import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStartupTrace, installStartupProcessHandlers, startupFailureDetail, startupLine } from './startupTrace'

describe('startup trace', () => {
  it('keeps allowlisted facts and drops free text', () => {
    const line = JSON.parse(startupLine('app.quit', {
      reason: 'single-instance-lock',
      ready: false,
      note: 'user secret',
      userData: 'C:/temp/user-data',
    }))
    expect(line.event).toBe('app.quit')
    expect(line.reason).toBe('single-instance-lock')
    expect(line.ready).toBe(false)
    expect(line.userData).toBe('C:/temp/user-data')
    expect(line.note).toBeUndefined()
  })

  it('keeps a bounded startup failure and drops other free text', () => {
    const line = JSON.parse(startupLine('startup-failed', {
      step: 'paths',
      name: 'Error',
      message: 'Failed to get \'appData\' path',
      stack: 'Error: Failed\n    at start',
      cause: 'TypeError: bad',
      note: 'secret token',
    }))
    expect(line.step).toBe('paths')
    expect(line.name).toBe('Error')
    expect(line.message).toBe('Failed to get \'appData\' path')
    expect(line.stack).toContain('at start')
    expect(line.cause).toBe('TypeError: bad')
    expect(line.note).toBeUndefined()
    const long = JSON.parse(startupLine('startup-failed', { message: 'm'.repeat(800), stack: 's'.repeat(3000) }))
    expect(long.message).toHaveLength(500)
    expect(long.stack).toHaveLength(2000)
  })

  it('records a missing cause and an unknown code in the startup file line', () => {
    const error = new Error("Failed to get 'appData' path")
    const detail = startupFailureDetail('paths', error)
    expect(detail.cause).toBeNull()
    expect(detail.code).toBe('UNKNOWN')
    const line = JSON.parse(startupLine('startup-failed', detail))
    expect(line.step).toBe('paths')
    expect(line.cause).toBeNull()
    expect(line.code).toBe('UNKNOWN')
    expect(line.message).toBe("Failed to get 'appData' path")
    const wrapped = new Error('outer')
    wrapped.cause = new Error('inner')
    expect(startupFailureDetail('settings', wrapped).cause).toBe('Error: inner')
  })

  it('registers the process handlers only when the startup trace is enabled', () => {
    const off = new EventEmitter()
    installStartupProcessHandlers({}, null, off)
    installStartupProcessHandlers({ PLANCIA_DIAG_STARTUP: '0' }, createStartupTrace(undefined, () => {}), off)
    expect(off.listenerCount('uncaughtException')).toBe(0)
    expect(off.listenerCount('unhandledRejection')).toBe(0)

    const on = new EventEmitter()
    const lines: string[] = []
    const trace = createStartupTrace(undefined, (line) => lines.push(line))
    installStartupProcessHandlers({ PLANCIA_DIAG_STARTUP: '1' }, trace, on)
    expect(on.listenerCount('uncaughtException')).toBe(1)
    expect(on.listenerCount('unhandledRejection')).toBe(1)
    on.emit('uncaughtException', new Error('boom'))
    on.emit('unhandledRejection', 'plain')
    expect(lines.map((line) => JSON.parse(line).event)).toEqual(['uncaughtException', 'unhandledRejection'])
    expect(JSON.parse(lines[0]).name).toBe('Error')
    expect(JSON.parse(lines[1]).name).toBe('non-error')

    const main = readFileSync(new URL('../../electron/main.ts', import.meta.url), 'utf8')
    const branch = main.slice(main.indexOf('if (startupTrace) {'), main.indexOf('function quitFor'))
    expect(branch).toContain('installStartupProcessHandlers(process.env, startupTrace, process)')
    expect(main.replace(branch, '')).not.toContain('installStartupProcessHandlers(')
    expect(main).not.toContain("process.on('uncaughtException'")
    expect(main).not.toContain("process.on('unhandledRejection'")
  })

  it('writes the same line to stderr and to the case directory', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'plancia-trace-'))
    const seen: string[] = []
    const trace = createStartupTrace(dir, (line) => seen.push(line))
    trace.setQuitReason('window-all-closed')
    trace.event('app.quit', { reason: trace.reason(), ready: true })
    const file = readFileSync(path.join(dir, 'startup.jsonl'), 'utf8').trim()
    expect(seen).toEqual([file])
    expect(JSON.parse(file).reason).toBe('window-all-closed')
  })
})
