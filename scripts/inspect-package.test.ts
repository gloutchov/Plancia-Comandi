import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { archiveEntryPath, normalizeArchiveEntries, unexpectedPackageEntry } from './archive-path.mjs'

const require = createRequire(new URL('../package.json', import.meta.url))
const asar = require('@electron/asar') as {
  createPackage: (src: string, dest: string) => Promise<void>
  extractFile: (archive: string, filename: string) => Buffer
}

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

describe('normalizeArchiveEntries', () => {
  it('catches a Windows listPackage entry list', () => {
    const entries = ['\\scripts\\x.mjs', '\\.env']
    expect(entries).toEqual([path.win32.join('/', 'scripts', 'x.mjs'), path.win32.join('/', '.env')])
    expect(normalizeArchiveEntries(entries)).toEqual(['/scripts/x.mjs', '/.env'])
    expect(unexpectedPackageEntry(['\\scripts\\x.mjs'])).toBe('Unexpected package entry: /scripts/')
    expect(unexpectedPackageEntry(['\\.env'])).toBe('Local settings or environment file in package')
    expect(unexpectedPackageEntry(entries)).toBe('Unexpected package entry: /scripts/')
    expect(unexpectedPackageEntry(['\\dist\\assets\\index.js', '/package.json'])).toBeNull()
  })
})

describe('asar extract path', () => {
  it('reads a nested file with the platform archive path', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plancia-asar-'))
    const source = path.join(root, 'src')
    fs.mkdirSync(path.join(source, 'assets'), { recursive: true })
    fs.writeFileSync(path.join(source, 'assets', 'index-BQhwdzkk.js'), 'bundle')
    const archive = path.join(root, 'app.asar')
    try {
      await asar.createPackage(source, archive)
      const filename = archiveEntryPath(path, 'assets', 'index-BQhwdzkk.js')
      expect(asar.extractFile(archive, filename).toString()).toBe('bundle')
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
