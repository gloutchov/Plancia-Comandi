import { describe, expect, it } from 'vitest'
import { formatDroppedPaths, quoteShellArg, shellQuoteKind } from './shellQuote'

describe('shellQuoteKind', () => {
  it('maps Windows shells and treats the others as POSIX', () => {
    expect(shellQuoteKind('powershell')).toBe('powershell')
    expect(shellQuoteKind('pwsh')).toBe('powershell')
    expect(shellQuoteKind('cmd')).toBe('cmd')
    expect(shellQuoteKind('gitbash')).toBe('posix')
    expect(shellQuoteKind('login')).toBe('posix')
    expect(shellQuoteKind('fish')).toBe('posix')
    expect(shellQuoteKind('unknown')).toBe('posix')
  })
})

describe('quoteShellArg', () => {
  it('quotes POSIX paths, including spaces and single quotes', () => {
    expect(quoteShellArg('/tmp/a b', 'posix')).toBe("'/tmp/a b'")
    expect(quoteShellArg("it's", 'posix')).toBe(`'it'\\''s'`)
    expect(quoteShellArg('$(rm)', 'posix')).toBe("'$(rm)'")
  })

  it('quotes PowerShell paths with doubled single quotes', () => {
    expect(quoteShellArg('C:\\Program Files\\a', 'powershell')).toBe("'C:\\Program Files\\a'")
    expect(quoteShellArg("o'brien", 'powershell')).toBe("'o''brien'")
    expect(quoteShellArg('$env:PATH', 'powershell')).toBe("'$env:PATH'")
  })

  it('quotes cmd paths and neutralizes quotes and percents', () => {
    expect(quoteShellArg('C:\\Program Files\\a&b', 'cmd')).toBe('"C:\\Program Files\\a&b"')
    expect(quoteShellArg('100%', 'cmd')).toBe('"100"^%""')
    expect(quoteShellArg('say "hi"', 'cmd')).toBe('"say ""hi"""')
  })

  it('rejects empty paths and paths that contain newlines or NUL', () => {
    expect(quoteShellArg('', 'posix')).toBeNull()
    expect(quoteShellArg('a\nb', 'posix')).toBeNull()
    expect(quoteShellArg('a\rb', 'powershell')).toBeNull()
    expect(quoteShellArg('a\0b', 'cmd')).toBeNull()
  })
})

describe('formatDroppedPaths', () => {
  it('joins several paths with spaces and leaves one trailing space', () => {
    expect(formatDroppedPaths(['/tmp/a b', '/tmp/c'], 'posix', 200)).toBe("'/tmp/a b' '/tmp/c' ")
    expect(formatDroppedPaths(['C:\\A B\\x.png', 'C:\\C\\y.png'], 'powershell', 200)).toBe(
      "'C:\\A B\\x.png' 'C:\\C\\y.png' ",
    )
  })

  it('skips unsafe paths and stops before exceeding the paste limit', () => {
    expect(formatDroppedPaths(['/ok', 'bad\npath', '/also'], 'posix', 200)).toBe("'/ok' '/also' ")
    expect(formatDroppedPaths(['/tmp/one', '/tmp/two'], 'posix', 12)).toBe("'/tmp/one' ")
    expect(formatDroppedPaths(['bad\n'], 'cmd', 200)).toBeNull()
  })
})
