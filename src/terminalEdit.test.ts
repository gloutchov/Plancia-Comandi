import { describe, expect, it } from 'vitest'
import { claimPasteGesture } from './terminalEdit'

describe('claimPasteGesture', () => {
  it('ignores a repeated gesture and accepts a different one immediately', () => {
    const seen = new Set<string>()
    expect(claimPasteGesture('edit:one', seen)).toBe(true)
    expect(claimPasteGesture('edit:one', seen)).toBe(false)
    expect(claimPasteGesture('edit:two', seen)).toBe(true)
    expect(claimPasteGesture('context:20', seen)).toBe(true)
    expect(claimPasteGesture('', seen)).toBe(false)
  })
})
