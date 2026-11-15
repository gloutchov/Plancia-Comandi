import { describe, expect, it } from 'vitest'
import { customPatternText } from './customPatternText'

describe('bounded custom-pattern text', () => {
  it('keeps the last non-empty line and distinct 10/12-line regions', () => {
    const text = Array.from({ length: 15 }, (_, index) => `line-${index}`).join('\n') + '\n\n'
    const result = customPatternText(text, 4096)
    expect(result.idle).toBe('line-14')
    expect(result.busy.split('\n')).toHaveLength(10)
    expect(result.attention.split('\n')).toHaveLength(12)
    expect(result.busy).not.toContain('line-5\n')
    expect(result.attention).toContain('line-5\n')
  })

  it('caps the copy before stripping ANSI and never returns the old prefix', () => {
    const result = customPatternText('PRIVATE_OLD_PREFIX' + 'x'.repeat(100_000) + '\u001b[31mready>\u001b[0m', 256)
    for (const value of Object.values(result)) {
      expect(value.length).toBeLessThanOrEqual(256)
      expect(value).not.toContain('PRIVATE_OLD_PREFIX')
      expect(value).not.toContain('\u001b')
    }
    expect(result.idle.endsWith('ready>')).toBe(true)
  })
})
