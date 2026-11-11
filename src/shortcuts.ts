export type ShortcutAction = 'new' | 'close' | 'split' | 'settings'

export interface KeyLike {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

export function appShortcut(event: KeyLike, platform: string): ShortcutAction | null {
  const key = event.key.toLowerCase()
  if (event.altKey) return null
  if (platform === 'darwin') {
    if (!event.metaKey || event.ctrlKey) return null
    if (event.shiftKey) return null
    if (key === 't') return 'new'
    if (key === 'w') return 'close'
    if (key === '\\') return 'split'
    if (key === ',') return 'settings'
    return null
  }
  if (!event.ctrlKey || event.metaKey || !event.shiftKey) return null
  if (key === 't') return 'new'
  if (key === 'w') return 'close'
  if (key === 'd') return 'split'
  if (key === ',') return 'settings'
  return null
}

export function isCopyKey(event: KeyLike, platform: string): boolean {
  const key = event.key.toLowerCase()
  if (key !== 'c' || event.altKey) return false
  if (platform === 'darwin') return event.metaKey && !event.ctrlKey && !event.shiftKey
  return event.ctrlKey && event.shiftKey && !event.metaKey
}

export function isPasteKey(event: KeyLike, platform: string): boolean {
  const key = event.key.toLowerCase()
  if (key !== 'v' || event.altKey) return false
  if (platform === 'darwin') return event.metaKey && !event.ctrlKey && !event.shiftKey
  return event.ctrlKey && event.shiftKey && !event.metaKey
}

/** Ctrl+C without Shift, Alt or Command. macOS copy is Command+C, so this key is always the interrupt there. */
export function isPlainCtrlC(event: KeyLike): boolean {
  return event.key.toLowerCase() === 'c' && event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey
}

export type CtrlCAction = 'copy' | 'interrupt'

/**
 * On Windows and Linux, Ctrl+C copies when the terminal has a selection and
 * otherwise sends the interrupt. macOS always interrupts on Ctrl+C.
 */
export function plainCtrlCAction(platform: string, hasSelection: boolean): CtrlCAction {
  if (platform === 'darwin') return 'interrupt'
  return hasSelection ? 'copy' : 'interrupt'
}
