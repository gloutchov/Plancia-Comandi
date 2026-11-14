import type { Terminal } from '@xterm/xterm'
import { vi } from 'vitest'
import { createPasteLane, pasteIntoTerminal } from '../terminalEdit'
import { runtimeLimits, validateAppConfig } from '../shared/appConfig'

export const quotingLimits = runtimeLimits(validateAppConfig(null))

const quotes = [
  ['ASCII', "'", "''"],
  ['U+2018', '\u2018', '\u2018\u2018'],
  ['U+2019', '\u2019', '\u2019\u2019'],
  ['U+201A', '\u201a', '\u201a\u201a'],
  ['U+201B', '\u201b', '\u201b\u201b'],
] as const

export const powerShellQuotingCases = [
  ...quotes.flatMap(([name, quote, escaped]) => [
    {
      name: `${name} command-like text`,
      value: `a${quote}; Write-Output PWNED; ${quote}b.txt`,
      quoted: `'a${escaped}; Write-Output PWNED; ${escaped}b.txt'`,
    },
    {
      name: `${name} user directory`,
      value: `C:\\Users\\O${quote}Brien\\\u2026\\img.png`,
      quoted: `'C:\\Users\\O${escaped}Brien\\\u2026\\img.png'`,
    },
  ]),
  {
    name: 'mixed adjacent quotes',
    value: "C:\\mixed\\O'\u2018\u2019\u201a\u201b\\img.png",
    quoted: "'C:\\mixed\\O''\u2018\u2018\u2019\u2019\u201a\u201a\u201b\u201b\\img.png'",
  },
  {
    name: 'literal PowerShell metacharacters',
    value: 'C:\\$env:PLANCIA_QUOTE_SENTINEL\\$(Write-Output PWNED)\\back`tick.png',
    quoted: "'C:\\$env:PLANCIA_QUOTE_SENTINEL\\$(Write-Output PWNED)\\back`tick.png'",
  },
  { name: 'trailing backslash', value: 'C:\\directory with spaces\\', quoted: "'C:\\directory with spaces\\'" },
  { name: 'other quote-like characters', value: 'C:\\O\u02bcBrien\\prime\u2032.png', quoted: "'C:\\O\u02bcBrien\\prime\u2032.png'" },
  { name: 'non-BMP characters', value: 'C:\\images \ud83e\uddea\\img.png', quoted: "'C:\\images \ud83e\uddea\\img.png'" },
]

let nextGesture = 0

/** Exercise the image branch without accessing Electron or the real clipboard. */
export async function capturePowerShellImagePaste(value: string, shellId: string, maxPasteChars = quotingLimits.maxPasteChars) {
  const pasted: string[] = []
  let textReads = 0
  vi.stubGlobal('window', {
    plancia: {
      readClipboardImage: async () => value,
      readClipboardText: async () => { textReads += 1; return 'synthetic fallback' },
    },
  })
  try {
    const term = { paste: (text: string) => pasted.push(text) } as unknown as Terminal
    await pasteIntoTerminal(term, shellId, { ...quotingLimits, maxPasteChars },
      { role: 'direct', id: `powershell-image-${++nextGesture}` }, createPasteLane())
    return { pasted, textReads }
  } finally {
    vi.unstubAllGlobals()
  }
}
