import { describe, expect, it } from 'vitest'
import { APP_CONFIG_DEFAULTS, runtimeLimits, validateAppConfig } from './appConfig'
import { sessionErrorMessage } from './diagnosticMessages'
import { translate } from './i18n'

const parameters = [
  ['sessions', 'maxSessions', 1, 32, 12],
  ['sessions', 'maxBacklogChars', 1000, 2_000_000, 300_000],
  ['sessions', 'retainedBacklogChars', 1000, 300_000, 250_000],
  ['sessions', 'statusIntervalMs', 100, 5000, 400],
  ['processSnapshot', 'unixTimeoutMs', 500, 60_000, 4000],
  ['processSnapshot', 'windowsTimeoutMs', 500, 60_000, 8000],
] as const

describe('central session and snapshot limits', () => {
  it.each(parameters)('validates %s.%s independently', (group, key, min, max, fallback) => {
    const value = (input: unknown) => (validateAppConfig({ [group]: { [key]: input } })[group] as unknown as Record<string, number>)[key]
    for (const invalid of [undefined, null, true, '1234', [], {}, NaN, Infinity]) expect(value(invalid)).toBe(fallback)
    expect(value(min - 500)).toBe(min)
    expect(value(max + 500)).toBe(max)
    expect(value(min + 0.6)).toBe(min + 1)
    expect(value(Math.round((min + max) / 2))).toBe(Math.round((min + max) / 2))
  })
  it('keeps retained backlog within its threshold including a missing retained value', () => {
    expect(validateAppConfig({ sessions: { maxBacklogChars: 2000 } }).sessions).toMatchObject({ maxBacklogChars: 2000, retainedBacklogChars: 2000 })
    expect(validateAppConfig({ sessions: { maxBacklogChars: 4000, retainedBacklogChars: 9000 } }).sessions.retainedBacklogChars).toBe(4000)
    expect(validateAppConfig({ sessions: { maxBacklogChars: 9000, retainedBacklogChars: 3000 } }).sessions.retainedBacklogChars).toBe(3000)
  })
  it('preserves existing budgets and exposes the configured session cap without extra privileges', () => {
    const config = validateAppConfig({ sessions: { maxSessions: 3 }, processSnapshot: { unixTimeoutMs: 2500 } })
    expect(config.childPolling).toEqual(APP_CONFIG_DEFAULTS.childPolling)
    expect(config.statusPatterns).toEqual(APP_CONFIG_DEFAULTS.statusPatterns)
    expect(runtimeLimits(config)).toMatchObject({ maxSessions: 3, maxPasteChars: 199_988 })
    for (const locale of ['it','en'] as const) expect(sessionErrorMessage(locale, 'max-sessions', 3)).toBe(translate(locale, 'maxSessions', {n:3}))
  })
})
