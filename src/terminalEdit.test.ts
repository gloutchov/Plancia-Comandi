import { describe, expect, it } from 'vitest'
import { claimPasteGesture, createPasteLane, decidePaste } from './terminalEdit'

describe('claimPasteGesture', () => {
  it('ignores a repeated gesture and accepts a different one immediately', () => {
    const seen = new Set<string>()
    expect(claimPasteGesture('edit:one', seen)).toBe(true)
    expect(claimPasteGesture('edit:one', seen)).toBe(false)
    expect(claimPasteGesture('edit:two', seen)).toBe(true)
    expect(claimPasteGesture('context:20', seen)).toBe(true)
    expect(claimPasteGesture('', seen)).toBe(false)
  })

  it('forgets the oldest gesture after the cap', () => {
    const seen = new Set<string>()
    expect(claimPasteGesture('a', seen, 2)).toBe(true)
    expect(claimPasteGesture('b', seen, 2)).toBe(true)
    expect(claimPasteGesture('c', seen, 2)).toBe(true)
    expect(seen.has('a')).toBe(false)
    expect(claimPasteGesture('b', seen, 2)).toBe(false)
    expect(claimPasteGesture('a', seen, 2)).toBe(true)
  })
})

describe('decidePaste', () => {
  it('pastes from the shortcut when the menu never claims it', () => {
    const lane = createPasteLane()
    expect(decidePaste(lane, { role: 'shortcut', id: '1' })).toEqual({ paste: true, gesture: 'shortcut:1' })
    expect(decidePaste(lane, { role: 'shortcut', id: '2' })).toEqual({ paste: true, gesture: 'shortcut:2' })
  })

  it('lets the menu accelerator paste when the key never arrives', () => {
    const lane = createPasteLane()
    expect(decidePaste(lane, { role: 'accelerator', id: 'a' })).toEqual({ paste: true, gesture: 'accelerator:a' })
    expect(decidePaste(lane, { role: 'accelerator', id: 'b' })).toEqual({ paste: true, gesture: 'accelerator:b' })
  })

  it('pastes once when the key and the menu accelerator are the same shortcut', () => {
    const keyFirst = createPasteLane()
    expect(decidePaste(keyFirst, { role: 'shortcut', id: '10' }).paste).toBe(true)
    expect(decidePaste(keyFirst, { role: 'accelerator', id: 'cmd-1' }).paste).toBe(false)

    const menuFirst = createPasteLane()
    expect(decidePaste(menuFirst, { role: 'accelerator', id: 'cmd-1' }).paste).toBe(true)
    expect(decidePaste(menuFirst, { role: 'shortcut', id: '10' }).paste).toBe(false)
  })

  it('accepts two direct pastes and does not block the following shortcut', () => {
    const lane = createPasteLane()
    expect(decidePaste(lane, { role: 'direct', id: 'click-1' }).paste).toBe(true)
    expect(decidePaste(lane, { role: 'direct', id: 'click-2' }).paste).toBe(true)
    expect(decidePaste(lane, { role: 'shortcut', id: '11' }).paste).toBe(true)
    expect(decidePaste(lane, { role: 'shortcut', id: '' }).paste).toBe(false)
  })
})
