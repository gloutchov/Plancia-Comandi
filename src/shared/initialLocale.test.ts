import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectInitialLocale, localeFromLanguage } from '../../electron/initialLocale'
import { SettingsStore } from '../../electron/settings'

describe('initial system language', () => {
  it.each([
    ['it', 'it'], ['it-IT', 'it'], ['it-CH', 'it'], [' IT_it ', 'it'],
    ['en-GB', 'en'], ['pt-BR', 'en'], ['unknown', 'en'], ['', 'en'], ['italiano', 'en'],
  ])('maps %j to %s', (language, expected) => {
    expect(localeFromLanguage(language)).toBe(expected)
  })

  it('uses the primary preferred language rather than region or secondary Italian', () => {
    const getLocale = vi.fn(() => 'it')
    expect(detectInitialLocale({ getPreferredSystemLanguages: () => ['pt-BR', 'it-IT'], getLocale })).toBe('en')
    expect(detectInitialLocale({ getPreferredSystemLanguages: () => ['it-CH', 'en'], getLocale })).toBe('it')
    expect(getLocale).not.toHaveBeenCalled()
  })

  it('falls back to the application locale, then English if detection fails', () => {
    expect(detectInitialLocale({ getPreferredSystemLanguages: () => [], getLocale: () => 'it-IT' })).toBe('it')
    expect(detectInitialLocale({ getPreferredSystemLanguages: () => { throw Error() }, getLocale: () => 'en-GB' })).toBe('en')
    expect(detectInitialLocale({ getPreferredSystemLanguages: () => { throw Error() }, getLocale: () => { throw Error() } })).toBe('en')
  })
})

const roots: string[] = []
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }) })

describe('initial locale and saved preferences', () => {
  it.each(['it', 'en'] as const)('uses %s only as the default and keeps a saved override across restarts', initialLocale => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plancia-locale-')); roots.push(root)
    const options = { userData: path.join(root, 'Plancia Comandi'), appData: root, maxBytes: 262144, initialLocale }
    const fresh = new SettingsStore(root, options)
    expect(fresh.data.locale).toBe(initialLocale)
    expect(fs.existsSync(fresh.file)).toBe(false)
    const override = initialLocale === 'it' ? 'en' : 'it'
    fresh.update({ locale: override, theme: 'dark', fontSize: 17 })
    const savedBytes = fs.readFileSync(fresh.file)
    const restarted = new SettingsStore(root, { ...options, initialLocale })
    expect(restarted.data).toMatchObject({ locale: override, theme: 'dark', fontSize: 17 })
    expect(fs.readFileSync(fresh.file)).toEqual(savedBytes)
    restarted.update({ notifyBadge: false })
    expect(restarted.data.locale).toBe(override)
    expect(new SettingsStore(root, { ...options, initialLocale: override }).data.locale).toBe(override)
  })

  it('uses English when no system language is supplied', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plancia-locale-')); roots.push(root)
    expect(new SettingsStore(root, { userData: root, appData: root, maxBytes: 262144 }).data.locale).toBe('en')
  })
})
