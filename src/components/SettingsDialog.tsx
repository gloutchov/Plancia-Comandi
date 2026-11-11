import { useState } from 'react'
import { parseDialogNumber } from '../shared/settingsForm'
import { defaultStatusConfig } from '../shared/status'
import { shortcutLabels, translate, type MessageKey } from '../shared/i18n'
import type { AppSettings, Locale, SettingsPatch, StatusConfig, ThemeSetting } from '../shared/types'

const TIMINGS: Array<{ key: keyof StatusConfig; label: MessageKey; help: MessageKey }> = [
  { key: 'quietTimeoutMs', label: 'quietTimeout', help: 'quietTimeoutHelp' },
  { key: 'promptIdleTimeoutMs', label: 'promptIdle', help: 'promptIdleHelp' },
  { key: 'busyMarkerQuietMs', label: 'busyMarker', help: 'busyMarkerHelp' },
  { key: 'titleBusyMaxMs', label: 'titleBusy', help: 'titleBusyHelp' },
  { key: 'childQuietTimeoutMs', label: 'childQuiet', help: 'childQuietHelp' },
  { key: 'startupGraceMs', label: 'startupGrace', help: 'startupGraceHelp' },
  { key: 'minBusyForNotifyMs', label: 'minBusyNotify', help: 'minBusyNotifyHelp' },
  { key: 'attentionHoldMs', label: 'attentionHold', help: 'attentionHold' },
]

const BURSTS: Array<{ key: keyof StatusConfig; label: MessageKey }> = [
  { key: 'burstBytes', label: 'burstBytes' },
  { key: 'burstCount', label: 'burstCount' },
  { key: 'burstWindowMs', label: 'burstWindow' },
]

export function SettingsDialog({
  locale,
  platform,
  settings,
  onClose,
  onChange,
}: {
  locale: Locale
  platform: NodeJS.Platform
  settings: AppSettings
  onClose: () => void
  onChange: (patch: SettingsPatch) => void
}) {
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars)
  const [draft, setDraft] = useState(settings)
  const [numberError, setNumberError] = useState(false)
  const shortcuts = shortcutLabels(platform)
  const shortcutRows = [
    [t('shortcutNew'), shortcuts.newSession],
    [t('shortcutClose'), shortcuts.close],
    [t('shortcutSplit'), shortcuts.split],
    [t('shortcutSettings'), shortcuts.settings],
    [t('shortcutPin'), shortcuts.pin],
    [t('shortcutCopy'), shortcuts.copy],
    [t('shortcutPaste'), shortcuts.paste],
    [t('shortcutInterrupt'), platform === 'darwin' ? t('shortcutInterruptKeys') : t('shortcutInterruptPlain')],
  ]

  function patch(next: SettingsPatch, updated: AppSettings) {
    setNumberError(false)
    setDraft(updated)
    onChange(next)
  }

  function changeStatusNumber(key: (typeof TIMINGS)[number]['key'] | (typeof BURSTS)[number]['key'], raw: string) {
    const value = parseDialogNumber(raw)
    if (value === null) {
      setNumberError(true)
      return
    }
    const status = { ...draft.status, [key]: value }
    patch({ status: { [key]: value } }, { ...draft, status })
  }

  function setTheme(theme: ThemeSetting) {
    patch({ theme }, { ...draft, theme })
  }

  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog dialog-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dialog-head">
          <h2 id="settings-title">{t('settings')}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('close')}>
            ×
          </button>
        </header>

        <section>
          <h3>{t('appearance')}</h3>
          <div className="segmented" role="radiogroup" aria-label={t('theme')}>
            {(['system', 'light', 'dark'] as ThemeSetting[]).map((theme) => (
              <button
                key={theme}
                type="button"
                role="radio"
                aria-checked={draft.theme === theme}
                className={draft.theme === theme ? 'is-on' : ''}
                onClick={() => setTheme(theme)}
              >
                {t(theme === 'system' ? 'themeSystem' : theme === 'light' ? 'themeLight' : 'themeDark')}
              </button>
            ))}
          </div>
          <div className="segmented" role="radiogroup" aria-label={t('language')}>
            <button
              type="button"
              role="radio"
              aria-checked={draft.locale === 'it'}
              className={draft.locale === 'it' ? 'is-on' : ''}
              onClick={() => patch({ locale: 'it' }, { ...draft, locale: 'it' })}
            >
              Italiano
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={draft.locale === 'en'}
              className={draft.locale === 'en' ? 'is-on' : ''}
              onClick={() => patch({ locale: 'en' }, { ...draft, locale: 'en' })}
            >
              English
            </button>
          </div>
          <label className="field">
            <span>
              {t('fontSize')} · {draft.fontSize}
            </span>
            <input
              type="range"
              min={11}
              max={22}
              value={draft.fontSize}
              onChange={(event) => {
                const fontSize = Number(event.target.value)
                patch({ fontSize }, { ...draft, fontSize })
              }}
            />
          </label>
        </section>

        <section>
          <h3>{t('alerts')}</h3>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.notifyDesktop}
              onChange={(event) => patch({ notifyDesktop: event.target.checked }, { ...draft, notifyDesktop: event.target.checked })}
            />
            <span>
              <strong>{t('notifyDesktop')}</strong>
              <small>{t('notifyDesktopHelp')}</small>
            </span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.notifyBadge}
              onChange={(event) => patch({ notifyBadge: event.target.checked }, { ...draft, notifyBadge: event.target.checked })}
            />
            <span>
              <strong>{t('notifyBadge')}</strong>
            </span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.showReasons}
              onChange={(event) => patch({ showReasons: event.target.checked }, { ...draft, showReasons: event.target.checked })}
            />
            <span>
              <strong>{t('showReasons')}</strong>
              <small>{t('showReasonsHelp')}</small>
            </span>
          </label>
        </section>

        <section>
          <h3>{t('detection')}</h3>
          <p className="help">{t('detectionHelp')}</p>
          {numberError ? (
            <p className="form-error" role="alert">
              {t('finiteNumber')}
            </p>
          ) : null}
          {TIMINGS.map((field) => (
            <label className="field" key={field.key}>
              <span>{t(field.label)}</span>
              <small>{t(field.help)}</small>
              <input
                type="number"
                value={Number(draft.status[field.key])}
                onChange={(event) => changeStatusNumber(field.key, event.target.value)}
              />
            </label>
          ))}
          <details>
            <summary>{t('advanced')}</summary>
            {BURSTS.map((field) => (
              <label className="field" key={field.key}>
                <span>{t(field.label)}</span>
                <input
                  type="number"
                  value={Number(draft.status[field.key])}
                  onChange={(event) => changeStatusNumber(field.key, event.target.value)}
                />
              </label>
            ))}
            <p className="help">{t('patternsHelp')}</p>
          </details>
          <div className="dialog-actions spread">
            <button
              type="button"
              className="btn"
              onClick={() => {
                patch({ status: defaultStatusConfig }, { ...draft, status: defaultStatusConfig })
              }}
            >
              {t('resetDefaults')}
            </button>
            <button type="button" className="btn" onClick={() => void window.plancia?.revealSettings()}>
              {t('openConfig')}
            </button>
          </div>
        </section>

        <section>
          <h3>{t('shortcuts')}</h3>
          <dl className="shortcuts">
            {shortcutRows.map(([label, keys]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{keys}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
