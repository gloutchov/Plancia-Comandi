import type { LayoutMode } from './types'

export const LAYOUT_ORDER: readonly LayoutMode[] = ['single', 'split', 'stack', 'grid']

/** How many panes the view can show. Grid keeps an empty pane rather than repeating a session. */
export function layoutCapacity(layout: LayoutMode): number {
  if (layout === 'grid') return 4
  if (layout === 'split' || layout === 'stack') return 2
  return 1
}

export function layoutMinimum(layout: LayoutMode): number {
  if (layout === 'grid') return 3
  if (layout === 'split' || layout === 'stack') return 2
  return 0
}

export function isLayoutEnabled(layout: LayoutMode, sessionCount: number): boolean {
  return sessionCount >= layoutMinimum(layout)
}

export function displayedLayout(saved: LayoutMode, sessionCount: number): LayoutMode {
  return isLayoutEnabled(saved, sessionCount) ? saved : 'single'
}

/**
 * When sessions are closed and the saved view no longer qualifies, fall back
 * to the single view. Callers persist that result. A saved view that is only
 * waiting for more sessions is left unchanged and displayed as single.
 */
export function coerceLayout(layout: LayoutMode, sessionCount: number): LayoutMode {
  return displayedLayout(layout, sessionCount)
}

export function nextLayout(current: LayoutMode, sessionCount: number): LayoutMode {
  const start = LAYOUT_ORDER.indexOf(current)
  const origin = start >= 0 ? start : 0
  for (let step = 1; step <= LAYOUT_ORDER.length; step += 1) {
    const candidate = LAYOUT_ORDER[(origin + step) % LAYOUT_ORDER.length]
    if (isLayoutEnabled(candidate, sessionCount)) return candidate
  }
  return 'single'
}

/**
 * Panes start at the focused session and continue in sidebar order, wrapping
 * to the top of the list. A session is never repeated. Slots that cannot be
 * filled are null: with three sessions the 2×2 grid leaves the fourth pane empty.
 */
export function selectVisibleSessions(
  orderedIds: readonly string[],
  focusedId: string | null,
  capacity: number,
): Array<string | null> {
  if (capacity <= 0) return []
  const slots: Array<string | null> = []
  if (orderedIds.length === 0) {
    while (slots.length < capacity) slots.push(null)
    return slots
  }
  const start = focusedId ? orderedIds.indexOf(focusedId) : 0
  const origin = start >= 0 ? start : 0
  const seen = new Set<string>()
  for (let step = 0; step < orderedIds.length && slots.length < capacity; step += 1) {
    const id = orderedIds[(origin + step) % orderedIds.length]
    if (seen.has(id)) break
    seen.add(id)
    slots.push(id)
  }
  while (slots.length < capacity) slots.push(null)
  return slots
}
