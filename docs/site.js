import { translations } from './i18n.js'

const preferences = window.planciaSitePreferences
let galleryView = preferences.getState().theme
let galleryChosen = false

function screenshot(view, locale) {
  return `./screenshots/plancia-${view}${locale === 'en' ? '-en' : ''}.png`
}

function renderGallery(locale) {
  const text = translations[locale]
  const source = screenshot(galleryView, locale)
  const image = document.querySelector('#gallery-image')
  image.src = source
  image.alt = text[`gallery.alt.${galleryView}`]
  document.querySelector('#gallery-caption').textContent = text[`gallery.caption.${galleryView}`]
  document.querySelector('#gallery-original').href = source
  document.querySelector('#gallery-panel').setAttribute('aria-labelledby', `tab-${galleryView}`)
  for (const button of document.querySelectorAll('[data-view]')) {
    const selected = button.dataset.view === galleryView
    button.setAttribute('aria-selected', String(selected))
    button.tabIndex = selected ? 0 : -1
  }
}

function render() {
  const { locale, theme, setting } = preferences.getState()
  const text = translations[locale]
  document.title = text.title
  document.querySelector('meta[name="description"]').content = text.description
  document.querySelector('meta[property="og:description"]').content = text.description
  for (const node of document.querySelectorAll('[data-copy]')) node.textContent = text[node.dataset.copy]
  for (const node of document.querySelectorAll('[data-label]')) node.setAttribute('aria-label', text[node.dataset.label])
  for (const node of document.querySelectorAll('[data-title]')) node.title = text[node.dataset.title]
  for (const node of document.querySelectorAll('[data-version]')) node.textContent = document.documentElement.dataset.release
  for (const button of document.querySelectorAll('[data-language]')) button.setAttribute('aria-pressed', String(button.dataset.language === locale))
  const themeButton = document.querySelector('#theme-toggle')
  themeButton.setAttribute('aria-label', text[theme === 'dark' ? 'theme.light' : 'theme.dark'])
  themeButton.title = themeButton.getAttribute('aria-label')
  document.querySelector('#system-theme').setAttribute('aria-pressed', String(setting === 'system'))
  document.querySelector('#preference-status').textContent = text[setting === 'system' ? 'theme.system' : 'theme.manual']
  for (const link of document.querySelectorAll('.manual-link')) link.href = `https://github.com/gloutchov/Plancia-Comandi/blob/main/${locale === 'it' ? 'ISTRUZIONI' : 'INSTRUCTIONS'}.md`
  const hero = document.querySelector('#hero-screen')
  hero.src = screenshot(theme, locale)
  hero.alt = text[`gallery.alt.${theme}`]
  if (!galleryChosen) galleryView = theme
  renderGallery(locale)
}

for (const button of document.querySelectorAll('[data-language]')) {
  button.addEventListener('click', () => {
    preferences.setLocale(button.dataset.language)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', button.dataset.language)
    history.replaceState(null, '', url)
  })
}
document.querySelector('#theme-toggle').addEventListener('click', () => preferences.setTheme(preferences.getState().theme === 'dark' ? 'light' : 'dark'))
document.querySelector('#system-theme').addEventListener('click', () => preferences.setTheme('system'))
const tabs = [...document.querySelectorAll('[data-view]')]
function chooseGallery(button) {
  galleryChosen = true
  galleryView = button.dataset.view
  renderGallery(preferences.getState().locale)
}
for (const button of tabs) {
  button.addEventListener('click', () => chooseGallery(button))
  button.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(button)
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
    if (next < 0) return
    event.preventDefault()
    chooseGallery(tabs[next])
    tabs[next].focus()
  })
}
window.addEventListener('plancia-site-preferences', render)
render()
