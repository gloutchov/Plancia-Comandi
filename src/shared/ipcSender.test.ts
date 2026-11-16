import { describe, expect, it } from 'vitest'
import { canonicalDocumentUrl, isTrustedRendererSender } from './ipcSender'

const URL = 'file:///synthetic/app.asar/dist/index.html'
function fixture(url = URL) {
  const frame = { url }
  const contents = { mainFrame: frame, isDestroyed: () => false }
  return { contents, event: { sender: contents, senderFrame: frame } }
}

describe('renderer IPC boundary', () => {
  it('accepts only the window main frame at the expected document, with an optional fragment', () => {
    const { contents, event } = fixture(URL + '#terminal')
    expect(isTrustedRendererSender(event, contents, URL)).toBe(true)
    expect(isTrustedRendererSender(event, contents, URL + '#other')).toBe(true)
  })

  it.each([null, 'missing', 'foreign', 'subframe', 'destroyed', 'disposed'])('rejects unavailable or foreign frames: %s', variant => {
    const { contents, event } = fixture()
    if (variant === null) event.senderFrame = null as never
    if (variant === 'missing') delete (event as Partial<typeof event>).senderFrame
    if (variant === 'foreign') event.sender = { ...contents }
    if (variant === 'subframe') event.senderFrame = { ...event.senderFrame }
    if (variant === 'destroyed') contents.isDestroyed = () => true
    if (variant === 'disposed') Object.defineProperty(event, 'senderFrame', { get: () => { throw new Error('disposed') } })
    expect(isTrustedRendererSender(event, contents, URL)).toBe(false)
    expect(isTrustedRendererSender(event, null, URL)).toBe(false)
  })

  it.each(['file:///synthetic/other.html', URL + '?untrusted=1', 'file://other/synthetic/app.asar/dist/index.html', 'about:blank', 'data:text/html,test', 'https://example.test/', 'invalid'])('rejects another document even in the same main frame: %s', url => {
    const { contents, event } = fixture(url)
    expect(isTrustedRendererSender(event, contents, URL)).toBe(false)
  })

  it('does not authorize an entire development origin or embedded credentials', () => {
    for (const url of ['http://127.0.0.1:47231/other', 'http://127.0.0.1:47232/', 'http://user@127.0.0.1:47231/', 'https://127.0.0.1:47231/']) {
      const { contents, event } = fixture(url)
      expect(isTrustedRendererSender(event, contents, 'http://127.0.0.1:47231/')).toBe(false)
    }
    const { contents, event } = fixture('http://127.0.0.1:47231/')
    expect(isTrustedRendererSender(event, contents, 'http://127.0.0.1:47231')).toBe(true)
  })

  it('uppercases only a Windows file drive letter and keeps the rest of the URL exact', () => {
    const lower = 'file:///c:/Users/RUNNER%7E1/app.asar/dist/index.html'
    const upper = 'file:///C:/Users/RUNNER%7E1/app.asar/dist/index.html'
    expect(canonicalDocumentUrl(lower + '#terminal', 'win32')).toBe(upper)
    expect(canonicalDocumentUrl(upper + '#other', 'win32')).toBe(upper)
    expect(canonicalDocumentUrl(lower + '?kept=1#gone', 'win32')).toBe(upper + '?kept=1')
    expect(canonicalDocumentUrl(lower, 'linux')).toBe(lower)
    const { contents, event } = fixture(upper)
    expect(isTrustedRendererSender(event, contents, lower + '#boot', 'win32')).toBe(true)
    expect(isTrustedRendererSender(event, contents, lower, 'linux')).toBe(false)
    expect(isTrustedRendererSender(event, contents, upper + '?kept=1', 'win32')).toBe(false)
    expect(isTrustedRendererSender(event, contents, 'file:///C:/Users/RUNNER~1/app.asar/dist/index.html', 'win32')).toBe(false)
    expect(isTrustedRendererSender(event, contents, 'file:///C:/users/RUNNER%7E1/app.asar/dist/index.html', 'win32')).toBe(false)
  })
})
