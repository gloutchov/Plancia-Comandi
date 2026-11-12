import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { archiveEntryPath } from './inspect-package.mjs'

describe('archiveEntryPath', () => {
  it('builds the backslash path @electron/asar looks up on Windows', () => {
    expect(archiveEntryPath(path.win32, 'dist', 'assets')).toBe('dist\\assets')
    expect(archiveEntryPath(path.win32, 'dist\\assets', 'index-BQhwdzkk.js')).toBe('dist\\assets\\index-BQhwdzkk.js')
    expect(archiveEntryPath(path.win32, 'dist\\assets', 'index-BQhwdzkk.js').split(path.win32.sep)).toEqual([
      'dist',
      'assets',
      'index-BQhwdzkk.js',
    ])
  })

  it('keeps forward slashes when the path module is posix', () => {
    expect(archiveEntryPath(path.posix, 'dist', 'assets')).toBe('dist/assets')
    expect(archiveEntryPath(path.posix, 'dist/assets', 'index-BQhwdzkk.js')).toBe('dist/assets/index-BQhwdzkk.js')
    expect(archiveEntryPath(path.posix, 'dist/assets', 'index-BQhwdzkk.js').split(path.posix.sep)).toEqual([
      'dist',
      'assets',
      'index-BQhwdzkk.js',
    ])
  })
})
