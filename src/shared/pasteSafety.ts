/** CR, LF and a final newline can submit commands without bracketed paste. */
export function requiresPasteConfirmation(text: string, bracketedPaste: boolean): boolean {
  return !bracketedPaste && /[\r\n]/.test(text)
}
