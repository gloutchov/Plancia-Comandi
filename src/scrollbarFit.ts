/**
 * Width that `@xterm/addon-fit` 0.11 subtracts before counting columns.
 * Fit reads `terminal.options.overviewRuler.width` and treats 0 as missing,
 * then uses its own 14 px constant. The geometry smoke measures a 15 px bar
 * on macOS and Windows, so a missing measurement uses 15.
 * `overviewRulerWidth` is a different option: it draws the decoration ruler.
 * This helper never sets it.
 */
export const SCROLLBAR_FIT_FALLBACK_PX = 15

export function scrollbarFitWidth(viewport: { offsetWidth: number; clientWidth: number } | null | undefined): number {
  if (!viewport) return SCROLLBAR_FIT_FALLBACK_PX
  const measured = viewport.offsetWidth - viewport.clientWidth
  if (!Number.isFinite(measured) || measured <= 0) return SCROLLBAR_FIT_FALLBACK_PX
  return measured
}

type MeasuredBox = { offsetWidth: number; clientWidth: number }
type FitScrollbarTerminal = {
  element: { querySelector(selector: string): unknown } | null | undefined
  options: { overviewRuler?: { width?: number }; overviewRulerWidth?: number }
}

function measuredBox(value: unknown): MeasuredBox | null {
  if (!value || typeof value !== 'object') return null
  const box = value as Partial<MeasuredBox>
  if (typeof box.offsetWidth !== 'number' || typeof box.clientWidth !== 'number') return null
  return { offsetWidth: box.offsetWidth, clientWidth: box.clientWidth }
}

export function applyFitScrollbarWidth(term: FitScrollbarTerminal): number {
  const width = scrollbarFitWidth(measuredBox(term.element?.querySelector('.xterm-viewport')))
  term.options.overviewRuler = { width }
  return width
}
