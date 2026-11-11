import { describe, expect, it } from 'vitest'
import { claimPasteGesture, createPasteLane, decidePaste, type PasteEvent, type PasteLane } from './terminalEdit'

function run(lane: PasteLane, events: PasteEvent[]): boolean[] {
  return events.map((event) => decidePaste(lane, event).paste)
}

const key = (id: string): PasteEvent => ({ role: 'shortcut', id })
const acc = (id: string): PasteEvent => ({ role: 'accelerator', id })
const click = (id: string): PasteEvent => ({ role: 'direct', id })

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
  it('pairs key1, key2, acc1, acc2 in order', () => {
    expect(run(createPasteLane(), [key('key1'), key('key2'), acc('acc1'), acc('acc2')])).toEqual([
      true,
      true,
      false,
      false,
    ])
  })

  it('pairs acc1, acc2, key1, key2 in order', () => {
    expect(run(createPasteLane(), [acc('acc1'), acc('acc2'), key('key1'), key('key2')])).toEqual([
      true,
      true,
      false,
      false,
    ])
  })

  it('pairs an interleaved shortcut and accelerator', () => {
    expect(run(createPasteLane(), [key('key1'), acc('acc1'), key('key2'), acc('acc2')])).toEqual([
      true,
      false,
      true,
      false,
    ])
  })

  it('does not let an orphan half swallow the next complete gesture of the other role', () => {
    const lane = createPasteLane()
    expect(decidePaste(lane, key('key1')).paste).toBe(true)
    expect(decidePaste(lane, click('menu-click')).paste).toBe(true)
    expect(lane.shortcuts).toEqual([])
    expect(lane.accelerators).toEqual([])
    expect(run(lane, [acc('acc2'), key('key2')])).toEqual([true, false])
  })

  it('pastes a shortcut when the menu accelerator is never delivered', () => {
    expect(run(createPasteLane(), [key('only-key')])).toEqual([true])
  })

  it('pastes an accelerator when the key is never delivered', () => {
    expect(run(createPasteLane(), [acc('only-acc')])).toEqual([true])
  })

  it('treats a menu or context click as its own gesture and retires open halves', () => {
    const lane = createPasteLane()
    expect(run(lane, [key('key1'), click('context-1'), click('context-2'), acc('acc2'), key('key2')])).toEqual([
      true,
      true,
      true,
      true,
      false,
    ])
    expect(lane.shortcuts).toEqual([])
    expect(lane.accelerators).toEqual([])
  })
})
