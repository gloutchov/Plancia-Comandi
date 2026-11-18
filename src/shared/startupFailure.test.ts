import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showStartupFailure } from '../../electron/startupFailure'
import { reportDiagnostic } from '../../electron/diagnostics'

vi.mock('../../electron/diagnostics', async (original) => ({
  ...await original<typeof import('../../electron/diagnostics')>(), reportDiagnostic: vi.fn(),
}))

describe('native startup failure', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it.each(['it', 'en'] as const)('reports a static %s dialog, safe stderr metadata and exit 1', (locale) => {
    const effects = { stderr: vi.fn(), showErrorBox: vi.fn(), exit: vi.fn() }
    const error = Object.assign(new Error('SECRET /private/profile/settings.json'), { code: 'EACCES', syscall: 'open' })
    showStartupFailure(locale, error, effects)
    expect(reportDiagnostic).toHaveBeenCalledWith('startup-failed', error)
    const line = effects.stderr.mock.calls[0][0]
    expect(JSON.parse(line)).toMatchObject({ event: 'startup-failed', code: 'EACCES', operation: 'open' })
    expect(Object.keys(JSON.parse(line)).sort()).toEqual(['at', 'code', 'event', 'operation'])
    const [title, content] = effects.showErrorBox.mock.calls[0]
    expect(title).toContain(locale === 'it' ? 'Errore di avvio' : 'Startup error')
    expect(content).toContain('STARTUP_FAILED')
    expect(content).toContain(locale === 'it' ? 'Chiudi' : 'Close')
    expect(line + title + content).not.toMatch(/SECRET|private|settings\.json/)
    expect(effects.exit).not.toHaveBeenCalled()
    vi.runOnlyPendingTimers()
    expect(effects.exit).toHaveBeenCalledExactlyOnceWith(1)
    expect(effects.showErrorBox.mock.invocationCallOrder[0]).toBeLessThan(effects.exit.mock.invocationCallOrder[0])
  })

  it('exits even when stderr and the native dialog fail, without rethrowing their errors', () => {
    const effects = {
      stderr: () => { throw new Error('stderr private path') },
      showErrorBox: vi.fn(() => { throw new Error('dialog private path') }), exit: vi.fn(),
    }
    const error = Object.defineProperties({}, {
      message: { get() { throw new Error('must not read message') } },
      stack: { get() { throw new Error('must not read stack') } },
    })
    expect(() => showStartupFailure('it', error, effects)).not.toThrow()
    expect(effects.showErrorBox).toHaveBeenCalledOnce()
    expect(effects.exit).not.toHaveBeenCalled()
    vi.runOnlyPendingTimers()
    expect(effects.exit).toHaveBeenCalledExactlyOnceWith(1)
  })
})
