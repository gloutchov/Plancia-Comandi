import type { Terminal } from '@xterm/xterm'
import type { RuntimeLimits } from './shared/appConfig'
import { interpretDrop } from './shared/drop'
import { formatDroppedPaths, quoteShellArg, shellQuoteKind } from './shared/shellQuote'

export interface TerminalEditTarget {
  term: Terminal
  shellId: string
  hasFocus: () => boolean
}

const GESTURE_LIMIT = 64
/** Oldest unmatched halves are dropped after this many, one cap per queue. */
export const PASTE_QUEUE_LIMIT = 64
const gestures = new Set<string>()
const targets = new Map<string, TerminalEditTarget>()
let focusedId: string | null = null

export interface PasteLane {
  /** Unmatched shortcut ids, oldest first. */
  shortcuts: string[]
  /** Unmatched accelerator ids, oldest first. */
  accelerators: string[]
}

export type PasteEvent =
  | { role: 'shortcut'; id: string }
  | { role: 'accelerator'; id: string }
  | { role: 'direct'; id: string }

export function createPasteLane(): PasteLane {
  return { shortcuts: [], accelerators: [] }
}

const lane = createPasteLane()

/**
 * One user action has one id. The same id is ignored if it is delivered again.
 * The remembered ids are capped so the set cannot grow without limit.
 */
export function claimPasteGesture(gesture: string, seen: Set<string> = gestures, limit = GESTURE_LIMIT): boolean {
  if (!gesture || seen.has(gesture)) return false
  seen.add(gesture)
  while (seen.size > limit) {
    const oldest = seen.values().next().value
    if (oldest === undefined) break
    seen.delete(oldest)
  }
  return true
}

/**
 * Keyboard shortcut and Edit-menu accelerator are two deliveries of one physical
 * key, matched in arrival order (one FIFO queue per side). The first delivery
 * pastes. The other closes the oldest unmatched half and does not paste.
 * A later key therefore closes with its own accelerator, not with whichever
 * half happens to be newest. Each queue keeps at most `limit` ids and drops
 * the oldest. A mate for a dropped half can then paste a second time: the cap
 * bounds memory, it does not make a burst past the cap unique. A direct click
 * (mouse on Edit → Paste, or the context menu) is a separate gesture: it
 * pastes and retires any unmatched halves, so an orphan cannot swallow the
 * next shortcut or accelerator.
 */
export function decidePaste(state: PasteLane, event: PasteEvent, limit = PASTE_QUEUE_LIMIT): { paste: boolean; gesture: string } {
  if (!event.id) return { paste: false, gesture: '' }
  if (event.role === 'direct') {
    state.shortcuts.length = 0
    state.accelerators.length = 0
    return { paste: true, gesture: `direct:${event.id}` }
  }
  const mine = event.role === 'shortcut' ? state.shortcuts : state.accelerators
  const other = event.role === 'shortcut' ? state.accelerators : state.shortcuts
  if (mine.includes(event.id)) return { paste: false, gesture: `${event.role}:${event.id}` }
  const mate = other.shift()
  if (mate !== undefined) {
    const mateRole = event.role === 'shortcut' ? 'accelerator' : 'shortcut'
    return { paste: false, gesture: `${mateRole}:${mate}` }
  }
  mine.push(event.id)
  const cap = Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : PASTE_QUEUE_LIMIT
  while (mine.length > cap) mine.shift()
  return { paste: true, gesture: `${event.role}:${event.id}` }
}

export function registerTerminalEdit(id: string, target: TerminalEditTarget): () => void {
  targets.set(id, target)
  return () => {
    if (targets.get(id) === target) targets.delete(id)
  }
}

export function setFocusedTerminal(id: string | null): void {
  focusedId = id
}

function activeTarget(): TerminalEditTarget | null {
  if (!focusedId) return null
  const target = targets.get(focusedId)
  if (!target || !target.hasFocus()) return null
  return target
}

export function terminalHasFocus(): boolean {
  return activeTarget() !== null
}

export function copyFocusedTerminal(): boolean {
  const target = activeTarget()
  if (!target) return false
  const selection = target.term.getSelection()
  if (!selection) return false
  void window.plancia?.writeClipboard(selection)
  return true
}

export function selectAllFocusedTerminal(): boolean {
  const target = activeTarget()
  if (!target) return false
  target.term.selectAll()
  return true
}

export function writeClipboardText(text: string): void {
  if (!text) return
  void window.plancia?.writeClipboard(text)
}

/**
 * xterm's paste() wraps the text in bracketed-paste markers when the program
 * has enabled that mode. See @xterm/xterm Clipboard.paste.
 */
export async function pasteIntoTerminal(
  term: Terminal,
  shellId: string,
  limits: RuntimeLimits,
  event: PasteEvent,
  state: PasteLane = lane,
): Promise<boolean> {
  const decision = decidePaste(state, event)
  if (!decision.paste || !claimPasteGesture(decision.gesture)) return false
  const bridge = window.plancia
  if (!bridge) return false
  try {
    const imagePath = await bridge.readClipboardImage()
    if (imagePath) {
      const quoted = quoteShellArg(imagePath, shellQuoteKind(shellId))
      if (quoted && quoted.length + 1 <= limits.maxPasteChars) {
        term.paste(`${quoted} `)
        return true
      }
    }
  } catch {
    // A missing image still leaves the text clipboard usable.
  }
  try {
    const text = await bridge.readClipboardText()
    if (!text) return true
    term.paste(text.length > limits.maxPasteChars ? text.slice(0, limits.maxPasteChars) : text)
  } catch {
    // Leave the terminal unchanged when the clipboard cannot be read.
  }
  return true
}

export async function pasteFocusedTerminal(limits: RuntimeLimits, event: PasteEvent): Promise<boolean> {
  const target = activeTarget()
  if (!target) return false
  await pasteIntoTerminal(target.term, target.shellId, limits, event)
  return true
}

export function dropIntoTerminal(
  term: Terminal,
  shellId: string,
  paths: readonly string[],
  text: string,
  limits: RuntimeLimits,
): void {
  const action = interpretDrop(
    { paths, text },
    { maxFiles: limits.maxDroppedFiles, maxPathChars: limits.maxPathChars, maxTextChars: limits.maxPasteChars },
  )
  if (action.type === 'paths') {
    const quoted = formatDroppedPaths(action.paths, shellQuoteKind(shellId), limits.maxPasteChars)
    if (quoted) term.paste(quoted)
    return
  }
  if (action.type === 'text') term.paste(action.text)
}
