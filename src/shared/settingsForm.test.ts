import { describe, expect, it } from 'vitest'
import { parseDialogNumber, settingsFromUpdate } from './settingsForm'

type Sample = { locale: 'it' | 'en'; quietTimeoutMs: number }

const current: Sample = { locale: 'it', quietTimeoutMs: 900 }

describe('settingsFromUpdate', () => {
  it('keeps the current settings when the update is null or undefined', () => {
    expect(settingsFromUpdate(current, null)).toBe(current)
    expect(settingsFromUpdate(current, undefined)).toBe(current)
  })

  it('accepts a returned settings object', () => {
    const next: Sample = { locale: 'en', quietTimeoutMs: 1200 }
    expect(settingsFromUpdate(current, next)).toBe(next)
  })
})

describe('parseDialogNumber', () => {
  it('accepts a finite number and refuses Infinity from 1e400', () => {
    expect(parseDialogNumber('900')).toBe(900)
    expect(parseDialogNumber('0')).toBe(0)
    expect(parseDialogNumber('1e400')).toBeNull()
    expect(parseDialogNumber('Infinity')).toBeNull()
    expect(parseDialogNumber('nope')).toBeNull()
  })
})
