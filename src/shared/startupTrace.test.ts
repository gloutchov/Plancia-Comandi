import { mkdtempSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStartupTrace, startupFailureDetail, startupLine } from './startupTrace'

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
