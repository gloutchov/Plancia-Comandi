import type { Locale } from '../src/shared/types'

type SystemLanguages = {
  getPreferredSystemLanguages(): string[]
  getLocale(): string
}

export function localeFromLanguage(language: string): Locale {
  return /^it(?:[-_][a-z0-9]{2,8})*$/i.test(language.trim()) ? 'it' : 'en'
}

/** Call after Electron is ready. The first preferred language takes precedence
 * over the application locale; a secondary Italian language must not override
 * a non-Italian primary language. No language or regional data is persisted. */
export function detectInitialLocale(system: SystemLanguages): Locale {
  try {
    const first = system.getPreferredSystemLanguages()[0]?.trim()
    if (first) return localeFromLanguage(first)
  } catch { /* Fall back to Chromium's application locale. */ }
  try { return localeFromLanguage(system.getLocale()) } catch { return 'en' }
}
