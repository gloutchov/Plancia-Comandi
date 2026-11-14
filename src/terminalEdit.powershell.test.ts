import type { Terminal } from '@xterm/xterm'
import { describe, expect, it } from 'vitest'
import { dropIntoTerminal } from './terminalEdit'
import { capturePowerShellImagePaste, powerShellQuotingCases, quotingLimits } from './test/powershellQuoting'

describe.each(['powershell', 'pwsh'])('%s path insertion', (shellId) => {
  it.each(powerShellQuotingCases)('drops $name as one quoted path', ({ value, quoted }) => {
    const pasted: string[] = []
    const term = { paste: (text: string) => pasted.push(text) } as unknown as Terminal
    dropIntoTerminal(term, shellId, [value], '', quotingLimits)
    expect(pasted).toEqual([`${quoted} `])
  })

  it.each(powerShellQuotingCases)('pastes an image with $name', async ({ value, quoted }) => {
    const result = await capturePowerShellImagePaste(value, shellId)
    expect(result.pasted).toEqual([`${quoted} `])
    expect(result.textReads).toBe(0)
  })

  it('counts the extra Unicode escape when enforcing the image paste limit', async () => {
    const value = 'a\u2019b'
    expect(await capturePowerShellImagePaste(value, shellId, 7)).toEqual({ pasted: ["'a\u2019\u2019b' "], textReads: 0 })
    expect(await capturePowerShellImagePaste(value, shellId, 6)).toEqual({ pasted: ['synthe'], textReads: 1 })
  })
})
