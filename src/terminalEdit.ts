import type { Terminal } from '@xterm/xterm'
import type { RuntimeLimits } from './shared/appConfig'
import { interpretDrop } from './shared/drop'
import { formatDroppedPaths, quoteShellArg, shellQuoteKind } from './shared/shellQuote'

export interface TerminalEditTarget {
  term: Terminal
  shellId: string
  hasFocus: () => boolean
}

const targets = new Map<string, TerminalEditTarget>()
let focusedId: string | null = null
let pasteLock = false

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
export async function pasteIntoTerminal(term: Terminal, shellId: string, limits: RuntimeLimits): Promise<void> {
  if (pasteLock) return
  pasteLock = true
  try {
    const bridge = window.plancia
    if (!bridge) return
    try {
      const imagePath = await bridge.readClipboardImage()
      if (imagePath) {
        const quoted = quoteShellArg(imagePath, shellQuoteKind(shellId))
        if (quoted && quoted.length + 1 <= limits.maxPasteChars) {
          term.paste(`${quoted} `)
          return
        }
      }
    } catch {
      // A missing image still leaves the text clipboard usable.
    }
    try {
      const text = await bridge.readClipboardText()
      if (!text) return
      term.paste(text.length > limits.maxPasteChars ? text.slice(0, limits.maxPasteChars) : text)
    } catch {
      // Leave the terminal unchanged when the clipboard cannot be read.
    }
  } finally {
    setTimeout(() => {
      pasteLock = false
    }, 150)
  }
}

export async function pasteFocusedTerminal(limits: RuntimeLimits): Promise<boolean> {
  const target = activeTarget()
  if (!target) return false
  await pasteIntoTerminal(target.term, target.shellId, limits)
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
