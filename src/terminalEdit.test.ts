import { describe, expect, it } from 'vitest'
import { PASTE_QUEUE_LIMIT, claimPasteGesture, createPasteLane, decidePaste, type PasteEvent, type PasteLane } from './terminalEdit'

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

  it('pairs an alternating accelerator and shortcut', () => {
    expect(run(createPasteLane(), [acc('acc1'), key('key1'), acc('acc2'), key('key2')])).toEqual([
      true,
      false,
      true,
      false,
    ])
  })

  it('keeps an orphan gesture until the opposite delivery closes it', () => {
    const lane = createPasteLane()
    expect(decidePaste(lane, key('orphan')).paste).toBe(true)
    expect(lane.shortcuts).toEqual(['orphan'])
    expect(lane.accelerators).toEqual([])
    const closed = decidePaste(lane, acc('later'))
    expect(closed.paste).toBe(false)
    expect(closed.gesture).toBe('shortcut:orphan')
    expect(lane.shortcuts).toEqual([])
    expect(lane.accelerators).toEqual([])
    expect(decidePaste(lane, key('next')).paste).toBe(true)
  })

  it('drops the oldest unmatched half once a FIFO queue reaches the cap', () => {
    const lane = createPasteLane()
    expect(decidePaste(lane, key('a'), 2).paste).toBe(true)
    expect(decidePaste(lane, key('b'), 2).paste).toBe(true)
    expect(decidePaste(lane, key('c'), 2).paste).toBe(true)
    expect(lane.shortcuts).toEqual(['b', 'c'])
    expect(decidePaste(lane, acc('x'), 2).paste).toBe(false)
    expect(lane.shortcuts).toEqual(['c'])
    expect(decidePaste(lane, acc('y'), 2).paste).toBe(false)
    expect(lane.shortcuts).toEqual([])
    expect(lane.accelerators).toEqual([])
  })

  it('can paste a second time when a mate arrives after its half was dropped', () => {
    const lane = createPasteLane()
    expect(decidePaste(lane, key('old'), 1).paste).toBe(true)
    expect(decidePaste(lane, key('kept'), 1).paste).toBe(true)
    expect(lane.shortcuts).toEqual(['kept'])
    expect(decidePaste(lane, acc('mate-of-kept'), 1).paste).toBe(false)
    expect(decidePaste(lane, acc('mate-of-old'), 1).paste).toBe(true)
  })

  it('keeps the default queue at the documented cap', () => {
    const lane = createPasteLane()
    for (let index = 0; index < PASTE_QUEUE_LIMIT + 1; index += 1) {
      expect(decidePaste(lane, key(`k${index}`)).paste).toBe(true)
    }
    expect(lane.shortcuts).toHaveLength(PASTE_QUEUE_LIMIT)
    expect(lane.shortcuts[0]).toBe('k1')
    expect(lane.shortcuts.at(-1)).toBe(`k${PASTE_QUEUE_LIMIT}`)
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
