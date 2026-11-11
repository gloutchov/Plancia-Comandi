import { describe, expect, it } from 'vitest'
import { shouldBlockNavigation } from './navigation'

const dev = 'http://127.0.0.1:47231/'
const page = 'file:///app/index.html'

describe('shouldBlockNavigation', () => {
  it('allows the current page and the development server origin', () => {
    expect(shouldBlockNavigation(page, page, undefined)).toBe(false)
    expect(shouldBlockNavigation('http://127.0.0.1:47231/index.html', page, dev)).toBe(false)
  })

  it('blocks dropped files, other origins and empty targets', () => {
    expect(shouldBlockNavigation('file:///Users/me/photo.png', page, undefined)).toBe(true)
    expect(shouldBlockNavigation('https://example.test/', page, dev)).toBe(true)
    expect(shouldBlockNavigation('http://127.0.0.1:9999/', page, dev)).toBe(true)
    expect(shouldBlockNavigation('', page, dev)).toBe(true)
    expect(shouldBlockNavigation('javascript:alert(1)', page, undefined)).toBe(true)
  })
})
