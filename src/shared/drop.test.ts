import { describe, expect, it } from 'vitest'
import { interpretDrop } from './drop'

const limits = { maxFiles: 2, maxPathChars: 20, maxTextChars: 8 }

describe('interpretDrop', () => {
  it('inserts file paths and ignores text that arrived with them', () => {
    expect(interpretDrop({ paths: ['/tmp/a.png', '/tmp/b.png'], text: 'caption' }, limits)).toEqual({
      type: 'paths',
      paths: ['/tmp/a.png', '/tmp/b.png'],
    })
  })

  it('pastes plain text when there are no usable files', () => {
    expect(interpretDrop({ paths: [], text: 'hello' }, limits)).toEqual({ type: 'text', text: 'hello' })
    expect(interpretDrop({ paths: ['   '], text: '' }, { ...limits, maxPathChars: 2 })).toEqual({ type: 'ignore' })
  })

  it('skips unsafe paths, caps the file count and truncates oversized text', () => {
    expect(
      interpretDrop({ paths: ['/ok', 'this-path-is-way-too-long', 'a\nb', '/next', '/extra'], text: 'hidden' }, limits),
    ).toEqual({ type: 'paths', paths: ['/ok', '/next'] })
    expect(interpretDrop({ paths: [], text: '0123456789' }, limits)).toEqual({ type: 'text', text: '01234567' })
    expect(interpretDrop({ paths: ['\0hidden'], text: '' }, limits)).toEqual({ type: 'ignore' })
  })
})
