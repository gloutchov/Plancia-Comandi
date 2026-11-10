import { useState } from 'react'
import { shellLabel, translate } from '../shared/i18n'
import type { Locale, ShellChoice } from '../shared/types'

export function NewSessionDialog({
  locale,
  shells,
  initialShellId,
  initialCwd,
  onCancel,
  onCreate,
}: {
  locale: Locale
  shells: ShellChoice[]
  initialShellId: string
  initialCwd: string
  onCancel: () => void
  onCreate: (input: { name: string; shellId: string; cwd: string }) => Promise<string | null>
}) {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
    translate(locale, key, vars)
  const [name, setName] = useState('')
  const [shellId, setShellId] = useState(initialShellId || shells[0]?.id || '')
  const [cwd, setCwd] = useState(initialCwd)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <div className="overlay" role="presentation" onMouseDown={onCancel}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-session-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (pending) return
          setPending(true)
          setError(null)
          void onCreate({ name, shellId, cwd }).then((message) => {
            setPending(false)
            if (message) setError(message)
          })
        }}
      >
        <h2 id="new-session-title">{t('newSession')}</h2>
        <label className="field">
          <span>{t('name')}</span>
          <input
            autoFocus
            value={name}
            placeholder={t('namePlaceholder')}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="field">
          <span>{t('shell')}</span>
          <select value={shellId} onChange={(event) => setShellId(event.target.value)}>
            {shells.map((shell) => (
              <option key={shell.id} value={shell.id}>
                {shellLabel(locale, shell.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>{t('folder')}</span>
          <div className="field-row">
            <input value={cwd} onChange={(event) => setCwd(event.target.value)} spellCheck={false} />
            <button
              type="button"
              className="btn"
              onClick={() => {
                void window.molo?.pickDirectory(cwd).then((picked) => {
                  if (picked) setCwd(picked)
                })
              }}
            >
              {t('browse')}
            </button>
          </div>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || !cwd.trim() || !shellId}>
            {t('open')}
          </button>
        </div>
      </form>
    </div>
  )
}
