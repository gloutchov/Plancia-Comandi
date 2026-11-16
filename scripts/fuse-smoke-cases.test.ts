import { describe, expect, it } from 'vitest'
import { processExitDetail, runAsNodeOutcome } from './fuse-smoke-cases.mjs'
import { isDiagnosticFile } from './fuse-smoke-launch.mjs'

describe('fuse smoke case outcomes', () => {
  it('treats a live release process as blocked and an early exit as a failure', () => {
    expect(runAsNodeOutcome({ shouldRun: false, written: false, alive: true })).toBe('blocked')
    expect(runAsNodeOutcome({ shouldRun: false, written: false, alive: false })).toBeNull()
    expect(runAsNodeOutcome({ shouldRun: true, written: true, alive: false })).toBe('ran')
    expect(runAsNodeOutcome({ shouldRun: true, written: false, alive: true })).toBeNull()
    expect(runAsNodeOutcome({ shouldRun: false, written: true, alive: true })).toBeNull()
  })

  it('keeps the exit code, signal and output of a process that quit', () => {
    expect(processExitDetail({ pid: 12, code: 0, signal: null, error: null, output: 'hello' })).toEqual({
      pid: 12, exitCode: 0, signal: null, spawnError: null, outputTail: 'hello',
    })
    expect(processExitDetail({ pid: 4, code: null, signal: null, error: 'spawn ENOENT', output: '' }).spawnError).toBe('spawn ENOENT')
  })

  it('keeps Electron logs and crash dumps and skips settings', () => {
    expect(isDiagnosticFile('debug.log')).toBe(true)
    expect(isDiagnosticFile('crashpad.dmp')).toBe(true)
    expect(isDiagnosticFile('startup.jsonl')).toBe(true)
    expect(isDiagnosticFile('settings.json')).toBe(false)
  })
})
