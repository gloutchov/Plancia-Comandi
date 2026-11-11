import { describe, expect, it } from 'vitest'
import {
  displayedLayout,
  isLayoutEnabled,
  layoutCapacity,
  nextLayout,
  selectVisibleSessions,
} from './layout'

const ids = ['a', 'b', 'c', 'd', 'e']

describe('layout availability', () => {
  it('enables side by side and stacked from two sessions, and the grid from three', () => {
    expect(isLayoutEnabled('single', 0)).toBe(true)
    expect(isLayoutEnabled('split', 1)).toBe(false)
    expect(isLayoutEnabled('stack', 1)).toBe(false)
    expect(isLayoutEnabled('split', 2)).toBe(true)
    expect(isLayoutEnabled('stack', 2)).toBe(true)
    expect(isLayoutEnabled('grid', 2)).toBe(false)
    expect(isLayoutEnabled('grid', 3)).toBe(true)
  })

  it('shows a saved view only while it is valid', () => {
    expect(displayedLayout('grid', 0)).toBe('single')
    expect(displayedLayout('grid', 2)).toBe('single')
    expect(displayedLayout('grid', 3)).toBe('grid')
    expect(displayedLayout('stack', 1)).toBe('single')
    expect(displayedLayout('split', 4)).toBe('split')
  })

  it('cycles through the views that the session count allows', () => {
    expect(nextLayout('single', 1)).toBe('single')
    expect(nextLayout('single', 2)).toBe('split')
    expect(nextLayout('split', 2)).toBe('stack')
    expect(nextLayout('stack', 2)).toBe('single')
    expect(nextLayout('stack', 5)).toBe('grid')
    expect(nextLayout('grid', 5)).toBe('single')
  })
})

describe('selectVisibleSessions', () => {
  it('starts at the focused session and wraps without repeating', () => {
    expect(selectVisibleSessions(ids, 'c', layoutCapacity('split'))).toEqual(['c', 'd'])
    expect(selectVisibleSessions(ids, 'e', layoutCapacity('stack'))).toEqual(['e', 'a'])
    expect(selectVisibleSessions(ids, 'd', layoutCapacity('grid'))).toEqual(['d', 'e', 'a', 'b'])
  })

  it('leaves the fourth grid pane empty when only three sessions exist', () => {
    expect(selectVisibleSessions(['a', 'b', 'c'], 'b', 4)).toEqual(['b', 'c', 'a', null])
  })

  it('fills a single pane with the focused session', () => {
    expect(selectVisibleSessions(ids, 'b', 1)).toEqual(['b'])
    expect(selectVisibleSessions(ids, 'missing', 1)).toEqual(['a'])
    expect(selectVisibleSessions([], 'a', 4)).toEqual([null, null, null, null])
  })
})
