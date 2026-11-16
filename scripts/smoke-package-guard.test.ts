import { describe, expect, it } from 'vitest'
import { SMOKE_BUDGET_MS, smokeBudgetExpired, smokeBudgetMessage, smokeUsesWindowsConptyChecks } from './smoke-package-guard.mjs'

describe('package smoke guard', () => {
  it('runs the ping, orphan and thread checks only on Windows', () => {
    expect(smokeUsesWindowsConptyChecks('win32')).toBe(true)
    expect(smokeUsesWindowsConptyChecks('darwin')).toBe(false)
    expect(smokeUsesWindowsConptyChecks('linux')).toBe(false)
  })

  it('expires the smoke at five minutes', () => {
    const started = 1_000
    expect(smokeBudgetExpired(started, started + SMOKE_BUDGET_MS - 1)).toBe(false)
    expect(smokeBudgetExpired(started, started + SMOKE_BUDGET_MS)).toBe(true)
    expect(smokeBudgetMessage()).toContain(String(SMOKE_BUDGET_MS))
    expect(smokeBudgetMessage()).toContain('application was stopped')
  })
})
