import { describe, expect, it } from 'vitest'
import { assertWindowChromeRegions } from './window-chrome-regions.mjs'

const regions = (platform: string) => ({
  platform, toolbar: platform === 'darwin' ? 'drag' : 'none',
  title: platform === 'darwin' ? 'drag' : 'none',
  group: platform === 'darwin' ? 'no-drag' : 'none',
  buttons: platform === 'darwin' ? Array(4).fill('no-drag') : ['no-drag', ...Array(4).fill('none')],
  terminals: ['none'], sessions: ['none'],
})

describe('window chrome region assertions', () => {
  it.each(['darwin', 'win32'])('accepts the intended %s CSS regions', platform => {
    expect(() => assertWindowChromeRegions(regions(platform), platform)).not.toThrow()
  })

  it('requires explicit macOS exclusions for the view group and every button', () => {
    for (const patch of [{ group: 'none' }, { buttons: ['none', ...Array(3).fill('no-drag')] }]) {
      expect(() => assertWindowChromeRegions({ ...regions('darwin'), ...patch }, 'darwin')).toThrow()
    }
  })

  it.each(['toolbar', 'title', 'group', 'buttons', 'terminals', 'sessions'])('rejects accidental Windows dragging in %s', area => {
    const value = regions('win32')
    const patch = { [area]: Array.isArray(value[area as keyof typeof value]) ? ['drag', ...Array(3).fill('none')] : 'drag' }
    expect(() => assertWindowChromeRegions({ ...value, ...patch }, 'win32')).toThrow()
  })

  it('rejects a missing view selector and an unexpected platform', () => {
    expect(() => assertWindowChromeRegions({ ...regions('darwin'), buttons: [] }, 'darwin')).toThrow()
    expect(() => assertWindowChromeRegions(regions('win32'), 'darwin')).toThrow()
  })
})
