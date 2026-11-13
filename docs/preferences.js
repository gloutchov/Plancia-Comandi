/* Runs before the stylesheet so saved appearance applies before first paint. */
(() => {
  'use strict'
  const keys = { locale: 'plancia-site.locale', theme: 'plancia-site.theme' }
  const languages = ['it', 'en']
  const themes = ['system', 'light', 'dark']
  const read = (key) => { try { return localStorage.getItem(key) } catch { return null } }
  const write = (key, value) => { try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value) } catch { /* Preferences remain usable without storage. */ } }
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const query = new URLSearchParams(window.location.search).get('lang')
  const savedLocale = read(keys.locale)
  const browserLanguage = navigator.languages?.[0] || navigator.language || 'en'
  let locale = languages.includes(query) ? query : languages.includes(savedLocale) ? savedLocale : /^it(?:-|$)/i.test(browserLanguage) ? 'it' : 'en'
  const savedTheme = read(keys.theme)
  let setting = themes.includes(savedTheme) ? savedTheme : 'system'
  const state = () => ({ locale, setting, theme: setting === 'system' ? media.matches ? 'dark' : 'light' : setting })
  const apply = () => {
    const next = state()
    document.documentElement.lang = next.locale
    document.documentElement.dataset.theme = next.theme
    window.dispatchEvent(new CustomEvent('plancia-site-preferences', { detail: next }))
  }
  window.planciaSitePreferences = Object.freeze({
    getState: state,
    setLocale(next) {
      if (!languages.includes(next)) return false
      locale = next
      write(keys.locale, next)
      apply()
      return true
    },
    setTheme(next) {
      if (!themes.includes(next)) return false
      setting = next
      write(keys.theme, next === 'system' ? null : next)
      apply()
      return true
    },
  })
  media.addEventListener('change', () => { if (setting === 'system') apply() })
  apply()
})()
