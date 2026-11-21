import type { Terminal } from '@xterm/xterm'
import type { RuntimeLimits } from './shared/appConfig'
import { limitText } from './shared/textLimit'
import { interpretDrop } from './shared/drop'
import { formatDroppedPaths, quoteShellArg, shellQuoteKind } from './shared/shellQuote'
import { requiresPasteConfirmation } from './shared/pasteSafety'
import type { PasteConfirmationAccess } from './pasteConfirmation'

export interface TerminalPasteGuard {
  sessionId: string
  isAvailable: () => boolean
  confirmation: PasteConfirmationAccess
}

export interface TerminalEditTarget {
  term: Terminal
  shellId: string
  hasFocus: () => boolean
  pasteGuard?: TerminalPasteGuard
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

function retireUnmatchedHalf(state: PasteLane, event: PasteEvent): void {
  if (event.role === 'direct') return
  const queue = event.role === 'shortcut' ? state.shortcuts : state.accelerators
  const index = queue.indexOf(event.id)
  if (index >= 0) queue.splice(index, 1)
}

/** Close an accelerator/shortcut pair while a modal owns the keyboard. */
export function discardPasteGesture(event: PasteEvent, state: PasteLane = lane): void {
  const decision = decidePaste(state, event)
  if (decision.paste) claimPasteGesture(decision.gesture)
  retireUnmatchedHalf(state, event)
}

function pasteAllowed(guard: TerminalPasteGuard | undefined, revision: number | undefined): boolean {
  return !guard || (guard.isAvailable() && guard.confirmation.canStart() && guard.confirmation.revision() === revision)
}

async function pastePrepared(term: Terminal, text: string, guard: TerminalPasteGuard | undefined, revision: number | undefined): Promise<boolean> {
  if (!text || !pasteAllowed(guard, revision)) return false
  const bracketed = term.modes?.bracketedPasteMode === true && term.options?.ignoreBracketedPasteMode !== true
  try {
    if (requiresPasteConfirmation(text, bracketed)) {
      if (!guard || !await guard.confirmation.request(guard.sessionId)) return false
      if (!guard.isAvailable()) return false
    }
    term.paste(text)
    return true
  } catch {
    return false
  }
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
  guard?: TerminalPasteGuard,
): Promise<boolean> {
  const decision = decidePaste(state, event)
  if (!decision.paste || !claimPasteGesture(decision.gesture)) return false
  const bridge = window.plancia
  if (!bridge) return false
  const revision = guard?.confirmation.revision()
  if (!pasteAllowed(guard, revision)) {
    retireUnmatchedHalf(state, event)
    return true
  }
  try {
    const imagePath = await bridge.readClipboardImage()
    if (imagePath) {
      const quoted = quoteShellArg(imagePath, shellQuoteKind(shellId))
      if (quoted && quoted.length + 1 <= limits.maxPasteChars) {
        await pastePrepared(term, `${quoted} `, guard, revision)
        return true
      }
    }
  } catch {
    // A missing image still leaves the text clipboard usable.
  }
  try {
    const text = await bridge.readClipboardText()
    if (!text) return true
    await pastePrepared(term, limitText(text, limits.maxPasteChars), guard, revision)
  } catch {
    // Leave the terminal unchanged when the clipboard cannot be read.
  }
  return true
}

export function pasteFocusedTerminal(limits: RuntimeLimits, event: PasteEvent): boolean {
  const target = activeTarget()
  if (!target) return false
  // Let preload send Edit's acknowledgment before any clipboard IPC (which may be expensive).
  const revision = target.pasteGuard?.confirmation.revision()
  setTimeout(() => {
    if (!pasteAllowed(target.pasteGuard, revision)) {
      discardPasteGesture(event)
      return
    }
    void pasteIntoTerminal(target.term, target.shellId, limits, event, lane, target.pasteGuard)
  }, 0)
  return true
}

export function dropIntoTerminal(
  term: Terminal,
  shellId: string,
  paths: readonly string[],
  text: string,
  limits: RuntimeLimits,
  guard?: TerminalPasteGuard,
): Promise<boolean> {
  const revision = guard?.confirmation.revision()
  if (!pasteAllowed(guard, revision)) return Promise.resolve(false)
  const action = interpretDrop(
    { paths, text },
    { maxFiles: limits.maxDroppedFiles, maxPathChars: limits.maxPathChars, maxTextChars: limits.maxPasteChars },
  )
  if (action.type === 'paths') {
    const quoted = formatDroppedPaths(action.paths, shellQuoteKind(shellId), limits.maxPasteChars)
    return quoted ? pastePrepared(term, quoted, guard, revision) : Promise.resolve(false)
  }
  return action.type === 'text' ? pastePrepared(term, action.text, guard, revision) : Promise.resolve(false)
}
