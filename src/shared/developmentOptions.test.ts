import { describe, expect, it } from 'vitest'
import { developmentOptions } from './developmentOptions'

const controls = [
  ['PLANCIA_DEMO', 'demo', '1'], ['MOLO_DEMO', 'demo', '1'],
  ['PLANCIA_DEVTOOLS', 'devtools', '1'], ['MOLO_DEVTOOLS', 'devtools', '1'],
  ['PLANCIA_SHOT_EXIT', 'shotExit', '1'], ['MOLO_SHOT_EXIT', 'shotExit', '1'],
  ['PLANCIA_SHOT_DIR', 'shotDir', 'synthetic-shots'], ['MOLO_SHOT_DIR', 'shotDir', 'synthetic-shots'],
  ['PLANCIA_DIAG_STARTUP', 'startupTrace', '1'], ['PLANCIA_DIAG_DIR', 'startupTraceDir', 'synthetic-trace'],
] as const

describe('development controls', () => {
  it.each(controls)('ignores %s in a package, including a supplied diagnostic directory', (name, key, value) => {
    const options = developmentOptions(true, { PLANCIA_DIAG_STARTUP: '1', [name]: value })
    expect(options[key]).toBeFalsy()
    expect(Object.values(options).some(Boolean)).toBe(false)
  })

  it.each(controls)('retains %s in development and leaves it off when absent', (name, key, value) => {
    const env = { ...(['PLANCIA_DIAG_DIR'].includes(name) ? { PLANCIA_DIAG_STARTUP: '1' } : {}), [name]: value }
    expect(developmentOptions(false, env)[key]).toBe(value === '1' ? true : value)
    expect(developmentOptions(false, {})[key]).toBeFalsy()
    expect(developmentOptions(true, {})[key]).toBeFalsy()
  })

  it('does not even read development variables from a packaged environment', () => {
    expect(() => developmentOptions(true, new Proxy({}, { get() { throw new Error('must not read') } }))).not.toThrow()
  })

  it('requires exactly 1 for flags, preserves aliases and prefers current paths', () => {
    expect(developmentOptions(false, { PLANCIA_DEMO: 'true', PLANCIA_DEVTOOLS: '0', PLANCIA_DIAG_STARTUP: 'yes' }))
      .toMatchObject({ demo: false, devtools: false, startupTrace: false })
    expect(developmentOptions(false, { PLANCIA_DEMO: '0', MOLO_DEMO: '1',
      PLANCIA_SHOT_DIR: 'current', MOLO_SHOT_DIR: 'legacy', PLANCIA_DIAG_DIR: 'ignored' }))
      .toMatchObject({ demo: true, shotDir: 'current', startupTraceDir: undefined })
  })
})
