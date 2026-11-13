import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { APP_CONFIG_DEFAULTS } from './appConfig'
import { clipboardFilesToDelete, clipboardImageDirectory, saveClipboardImage } from './clipboardImages'

const roots: string[] = []

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plancia-clip-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('clipboard image files', () => {
  it('refuses a directory that would leave the user-data root', () => {
    expect(clipboardImageDirectory('/data/user', '..')).toBeNull()
    expect(clipboardImageDirectory('/data/user', 'nested/name')).toBeNull()
    expect(clipboardImageDirectory('/data/user', '/tmp')).toBeNull()
    expect(clipboardImageDirectory('/data/user', 'clipboard-images')).toBe(path.resolve('/data/user/clipboard-images'))
  })

  it('writes a generated PNG inside the configured directory and restricts permissions', () => {
    const root = tempRoot()
    const saved = saveClipboardImage({
      png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      width: 2,
      height: 2,
      config: APP_CONFIG_DEFAULTS.clipboardImages,
      userDataDir: root,
      now: 1_700_000_000_000,
      randomHex: '0123456789abcdef',
    })
    expect(saved).toBe(path.join(root, 'clipboard-images', `img-${(1_700_000_000_000).toString(36)}-0123456789abcdef.png`))
    expect(saved && fs.existsSync(saved)).toBe(true)
    if (process.platform !== 'win32' && saved) {
      expect(fs.statSync(path.dirname(saved)).mode & 0o777).toBe(0o700)
      expect(fs.statSync(saved).mode & 0o777).toBe(0o600)
    }
  })

  it('rejects oversized images, huge edges and a prefix that validation would replace', () => {
    const root = tempRoot()
    const base = {
      png: Buffer.from([1, 2, 3, 4]),
      width: 2,
      height: 2,
      userDataDir: root,
      randomHex: '0123456789abcdef',
    }
    expect(saveClipboardImage({ ...base, config: { ...APP_CONFIG_DEFAULTS.clipboardImages, maxBytes: 65_536 } })).toBeTruthy()
    expect(
      saveClipboardImage({
        ...base,
        png: Buffer.alloc(70_000),
        config: { ...APP_CONFIG_DEFAULTS.clipboardImages, maxBytes: 65_536 },
      }),
    ).toBeNull()
    expect(
      saveClipboardImage({
        ...base,
        width: 20_000,
        config: APP_CONFIG_DEFAULTS.clipboardImages,
      }),
    ).toBeNull()
    const escaped = saveClipboardImage({
      ...base,
      config: { ...APP_CONFIG_DEFAULTS.clipboardImages, directoryName: '..', filePrefix: '../x' },
    })
    expect(escaped?.startsWith(path.join(root, 'clipboard-images'))).toBe(true)
    expect(path.basename(escaped ?? '')).toMatch(/^img-/)
  })

  it('deletes expired images and keeps only the configured number of newer ones', () => {
    const now = 1_000_000_000_000
    const hour = 60 * 60 * 1000
    const config = { ...APP_CONFIG_DEFAULTS.clipboardImages, maxKeep: 2, maxAgeHours: 24 }
    const removed = clipboardFilesToDelete(
      [
        { name: 'img-old-0123456789abcdef.png', mtimeMs: now - 25 * hour },
        { name: 'img-a-0123456789abcdef.png', mtimeMs: now - 3 * hour },
        { name: 'img-b-0123456789abcdef.png', mtimeMs: now - 2 * hour },
        { name: 'img-c-0123456789abcdef.png', mtimeMs: now - hour },
        { name: '.img-stale-0123456789abcdef.png.tmp', mtimeMs: now - 2 * hour },
        { name: 'notes.txt', mtimeMs: now - 100 * hour },
      ],
      config,
      now,
    )
    expect(removed.sort()).toEqual(
      ['.img-stale-0123456789abcdef.png.tmp', 'img-a-0123456789abcdef.png', 'img-old-0123456789abcdef.png'].sort(),
    )
  })
})
