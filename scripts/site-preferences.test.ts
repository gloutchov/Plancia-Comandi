import fs from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('../docs/preferences.js', import.meta.url), 'utf8')

function browser({ language = 'en-US', dark = false, saved = {}, query = '', storageThrows = false }: {
  language?: string; dark?: boolean; saved?: Record<string, string>; query?: string; storageThrows?: boolean
} = {}) {
  const values = new Map(Object.entries(saved))
  let mediaChanged = () => {}
  const media = { matches: dark, addEventListener: (_event: string, listener: () => void) => { mediaChanged = listener } }
  const html = { lang: '', dataset: {} as Record<string, string> }
  const window = { matchMedia: () => media, location: { search: query }, dispatchEvent: () => {}, planciaSitePreferences: undefined as unknown as { getState: () => { locale: string; theme: string; setting: string }; setLocale: (next: string) => boolean; setTheme: (next: string) => boolean } }
  const localStorage = {
    getItem(key: string) { if (storageThrows) throw Error('Storage blocked'); return values.get(key) ?? null },
    setItem(key: string, value: string) { if (storageThrows) throw Error('Storage blocked'); values.set(key, value) },
    removeItem(key: string) { if (storageThrows) throw Error('Storage blocked'); values.delete(key) },
  }
  const context = vm.createContext({ window, document: { documentElement: html }, navigator: { languages: [language], language }, localStorage, URLSearchParams, CustomEvent: class { constructor(readonly type: string, readonly detail: unknown) {} } })
  vm.runInContext(source, context)
  return { api: window.planciaSitePreferences, html, values, systemTheme(next: boolean) { media.matches = next; mediaChanged() } }
}

describe('landing page preferences', () => {
  it.each(['it', 'it-IT', 'it-CH'])('detects Italian browser locale %s', language => expect(browser({ language }).api.getState().locale).toBe('it'))
  it.each(['en-US', 'fr-FR', 'de-DE'])('uses English for browser locale %s', language => expect(browser({ language }).api.getState().locale).toBe('en'))
  it('restores saved overrides before styling', () => {
    const b = browser({ language: 'it-IT', dark: false, saved: { 'plancia-site.locale': 'en', 'plancia-site.theme': 'dark' } })
    expect(b.html).toEqual({ lang: 'en', dataset: { theme: 'dark' } })
  })
  it('accepts a supported URL language and ignores an invalid value', () => {
    expect(browser({ query: '?lang=it', saved: { 'plancia-site.locale': 'en' } }).api.getState().locale).toBe('it')
    expect(browser({ query: '?lang=bad', language: 'it-IT' }).api.getState().locale).toBe('it')
  })
  it('ignores corrupted saved values', () => expect(browser({ dark: true, saved: { 'plancia-site.locale': '<script>', 'plancia-site.theme': 'unknown' } }).api.getState()).toEqual({ locale: 'en', setting: 'system', theme: 'dark' }))
  it('reacts to system theme changes until manually overridden', () => {
    const b = browser()
    b.systemTheme(true)
    expect(b.api.getState().theme).toBe('dark')
    b.api.setTheme('light')
    b.systemTheme(true)
    expect(b.api.getState().theme).toBe('light')
    expect(b.values.get('plancia-site.theme')).toBe('light')
  })
  it('clears the override when following the system again', () => {
    const b = browser({ dark: true })
    b.api.setTheme('light')
    b.api.setTheme('system')
    expect(b.api.getState()).toEqual({ locale: 'en', setting: 'system', theme: 'dark' })
    expect(b.values.has('plancia-site.theme')).toBe(false)
  })
  it('keeps controls working when local storage is blocked', () => {
    const b = browser({ storageThrows: true })
    expect(b.api.setLocale('it')).toBe(true)
    expect(b.api.setTheme('dark')).toBe(true)
    expect(b.html).toEqual({ lang: 'it', dataset: { theme: 'dark' } })
  })
  it('rejects unsupported language and theme updates without persisting them', () => {
    const b = browser()
    expect(b.api.setLocale('fr')).toBe(false)
    expect(b.api.setTheme('custom')).toBe(false)
    expect(b.values.size).toBe(0)
    expect(b.api.getState()).toEqual({ locale: 'en', setting: 'system', theme: 'light' })
  })
})
