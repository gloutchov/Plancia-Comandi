import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectShells } from '../../electron/shells'
import { shellQuoteKind } from './shellQuote'

const platform = Object.getOwnPropertyDescriptor(process, 'platform')!

describe('fish shell discovery', () => {
  beforeEach(() => {
    Object.defineProperty(process, 'platform', { ...platform, value: 'darwin' })
    vi.stubEnv('SHELL', '/bin/zsh')
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', platform)
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it.each(['/opt/homebrew/bin/fish', '/usr/local/bin/fish', '/bin/fish', '/usr/bin/fish'])(
    'discovers %s with the fish quote kind', (command) => {
      vi.spyOn(fs, 'accessSync').mockImplementation((file) => {
        if (file !== '/bin/zsh' && file !== command) throw new Error('synthetic missing shell')
      })
      const shells = detectShells()
      const fish = shells.filter((shell) => shell.id === 'fish')
      expect(fish).toEqual([{ id: 'fish', command, args: ['-l'], labelKey: 'shellFish' }])
      expect(shellQuoteKind(fish[0].id)).toBe('fish')
    },
  )
})
