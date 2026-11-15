import type { Terminal } from '@xterm/xterm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPasteLane, dropIntoTerminal, pasteIntoTerminal } from './terminalEdit'
import { runtimeLimits, validateAppConfig } from './shared/appConfig'
import { fishQuotingCases } from './test/fishQuoting'

const limits = runtimeLimits(validateAppConfig(null))
let nextGesture = 0

afterEach(() => vi.unstubAllGlobals())

async function pasteImage(value: string, maxPasteChars = limits.maxPasteChars) {
  const pasted: string[] = []
  const readClipboardText = vi.fn(async () => 'synthetic fallback')
  vi.stubGlobal('window', { plancia: { readClipboardImage: async () => value, readClipboardText } })
  const term = { paste: (text: string) => pasted.push(text) } as unknown as Terminal
  await pasteIntoTerminal(term, 'fish', { ...limits, maxPasteChars },
    { role: 'direct', id: `fish-image-${++nextGesture}` }, createPasteLane())
  return { pasted, textReads: readClipboardText.mock.calls.length }
}

describe('fish path insertion', () => {
  it.each(fishQuotingCases)('drops $name with fish escapes', ({ value, quoted }) => {
    const pasted: string[] = []
    const term = { paste: (text: string) => pasted.push(text) } as unknown as Terminal
    dropIntoTerminal(term, 'fish', [value], '', limits)
    expect(pasted).toEqual([`${quoted} `])
  })

  it.each(fishQuotingCases)('pastes an image with $name', async ({ value, quoted }) => {
    expect(await pasteImage(value)).toEqual({ pasted: [`${quoted} `], textReads: 0 })
  })

  it('counts fish escapes and the trailing space before pasting an image', async () => {
    expect(await pasteImage('a\\', 6)).toEqual({ pasted: [String.raw`'a\\' `], textReads: 0 })
    expect(await pasteImage('a\\', 5)).toEqual({ pasted: ['synth'], textReads: 1 })
  })

  it('preserves free dropped and clipboard text', async () => {
    const value = "literal \\ ' $HOME"
    const pasted: string[] = []
    const term = { paste: (text: string) => pasted.push(text) } as unknown as Terminal
    dropIntoTerminal(term, 'fish', [], value, limits)
    vi.stubGlobal('window', { plancia: { readClipboardImage: async () => null, readClipboardText: async () => value } })
    await pasteIntoTerminal(term, 'fish', limits,
      { role: 'direct', id: `fish-text-${++nextGesture}` }, createPasteLane())
    expect(pasted).toEqual([value, value])
  })
})
