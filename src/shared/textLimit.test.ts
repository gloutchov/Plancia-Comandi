import { describe, expect, it } from 'vitest'
import { limitText } from './textLimit'

describe('limitText', () => {
  it('drops the high surrogate when an emoji straddles the limit', () => {
    const emoji = '😀'
    expect(emoji).toHaveLength(2)
    const text = `ab${emoji}cd`
    expect(limitText(text, 3)).toBe('ab')
    expect(limitText(text, 4)).toBe(`ab${emoji}`)
    expect(limitText(emoji, 1)).toBe('')
  })

  it('keeps a string that is already within the limit', () => {
    expect(limitText('ciao', 4)).toBe('ciao')
    expect(limitText('ciao', 0)).toBe('')
  })
})
