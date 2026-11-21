import { describe, expect, it } from 'vitest'
import { requiresPasteConfirmation } from './pasteSafety'

describe('multiline paste decision', () => {
  it.each(['', 'single command', 'literal \\n'])('keeps %j immediate without a line ending', text => {
    expect(requiresPasteConfirmation(text, false)).toBe(false)
  })
  it.each(['one\n', 'one\r', 'one\r\n', 'one\ntwo', 'one\rtwo', '\n', '\r'])('confirms %j without bracketed paste', text => {
    expect(requiresPasteConfirmation(text, false)).toBe(true)
    expect(requiresPasteConfirmation(text, true)).toBe(false)
  })
})
