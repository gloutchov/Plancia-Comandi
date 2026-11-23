import { describe, expect, it } from 'vitest'
import { SCROLLBAR_FIT_FALLBACK_PX, applyFitScrollbarWidth, scrollbarFitWidth } from './scrollbarFit'

describe('scrollbar width for FitAddon 0.11', () => {
  it('uses the laid-out scrollbar, offsetWidth minus clientWidth', () => {
    expect(scrollbarFitWidth({ offsetWidth: 800, clientWidth: 785 })).toBe(15)
    expect(scrollbarFitWidth({ offsetWidth: 400, clientWidth: 388 })).toBe(12)
  })

  it('falls back when the bar is an overlay, missing, or not yet laid out', () => {
    expect(scrollbarFitWidth({ offsetWidth: 800, clientWidth: 800 })).toBe(SCROLLBAR_FIT_FALLBACK_PX)
    expect(scrollbarFitWidth({ offsetWidth: 10, clientWidth: 12 })).toBe(SCROLLBAR_FIT_FALLBACK_PX)
    expect(scrollbarFitWidth({ offsetWidth: Number.NaN, clientWidth: 10 })).toBe(SCROLLBAR_FIT_FALLBACK_PX)
    expect(scrollbarFitWidth(null)).toBe(SCROLLBAR_FIT_FALLBACK_PX)
    expect(scrollbarFitWidth(undefined)).toBe(SCROLLBAR_FIT_FALLBACK_PX)
    expect(SCROLLBAR_FIT_FALLBACK_PX).toBe(15)
  })

  it('records the width on overviewRuler and does not turn the decoration ruler on', () => {
    const term: Parameters<typeof applyFitScrollbarWidth>[0] = {
      element: { querySelector: () => ({ offsetWidth: 200, clientWidth: 185 }) },
      options: { overviewRulerWidth: 0 },
    }
    expect(applyFitScrollbarWidth(term)).toBe(15)
    expect(term.options.overviewRuler).toEqual({ width: 15 })
    expect(term.options.overviewRulerWidth).toBe(0)
  })

  it('uses the fallback for a hidden viewport that reports no bar', () => {
    const term = {
      element: { querySelector: () => ({ offsetWidth: 0, clientWidth: 0 }) },
      options: {} as { overviewRuler?: { width?: number }; overviewRulerWidth?: number },
    }
    applyFitScrollbarWidth(term)
    expect(term.options.overviewRuler).toEqual({ width: SCROLLBAR_FIT_FALLBACK_PX })
    expect(term.options.overviewRulerWidth).toBeUndefined()
  })
})
