import { useEffect, useRef, useState } from 'react'
import { phaseKey, reasonKey, shellLabel, translate, type MessageKey } from '../shared/i18n'
import { shortenPath } from '../shared/paths'
import type { Locale, SessionInfo } from '../shared/types'
import { cx } from '../cx'

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="14" width="3.2" height="7" rx="1" />
      <rect x="10.4" y="14" width="3.2" height="7" rx="1" />
      <rect x="18.8" y="14" width="3.2" height="7" rx="1" />
      <rect x="1" y="10.5" width="22" height="3.4" rx="1.2" />
    </svg>
  )
}

export function Sidebar({
  locale,
  home,
  version,
  sessions,
  focusedId,
  visibleIds,
  canSplit,
  showReasons,
  darwin,
  onFocus,
  onTogglePin,
  onClose,
  onRename,
  onCreate,
  onOpenSettings,
}: {
  locale: Locale
  home: string
  version: string
  sessions: SessionInfo[]
  focusedId: string | null
  visibleIds: Set<string>
  canSplit: boolean
  showReasons: boolean
  darwin: boolean
  onFocus: (id: string) => void
  onTogglePin: (id: string) => void
  onClose: (session: SessionInfo) => void
  onRename: (id: string, name: string) => void
  onCreate: () => void
  onOpenSettings: () => void
}) {
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars)
  const [renamingId, setRenamingId] = useState<string | null>(null)

  return (
    <aside className={cx('sidebar', darwin && 'is-darwin')}>
      <div className="brand">
        <Mark />
        <div>
          <strong>{t('appName')}</strong>
          <span>{t('tagline')}</span>
        </div>
      </div>
      <button type="button" className="btn btn-primary new-session" data-testid="new-session" onClick={onCreate}>
        <span aria-hidden="true">+</span>
        {t('newSession')}
      </button>
      <div className="session-label">
        {t('sessions')}
        <span>{sessions.length}</span>
      </div>
      <div className="session-list" role="listbox" aria-label={t('sessions')}>
        {sessions.length === 0 ? <p className="empty-list">{t('noSessions')}</p> : null}
        {sessions.map((session) => {
          const name = session.autoName ? t('defaultSession', { n: session.index }) : session.name
          const phase = t(phaseKey(session.phase))
          const reason = t(reasonKey(session.reason))
          return (
            <div
              key={session.id}
              className={cx('session', session.id === focusedId && 'is-focused', visibleIds.size > 1 && visibleIds.has(session.id) && 'is-pinned')}
              role="option"
              aria-selected={session.id === focusedId}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey) onTogglePin(session.id)
                else onFocus(session.id)
              }}
            >
              <span className="pin-wrap" title={canSplit ? t('pin') : t('layoutNeedTwo')}>
                <button
                  type="button"
                  className={cx('pin', visibleIds.size > 1 && visibleIds.has(session.id) && 'is-on')}
                  aria-pressed={visibleIds.size > 1 && visibleIds.has(session.id)}
                  aria-label={canSplit ? t('pin') : t('layoutNeedTwo')}
                  disabled={!canSplit}
                  onClick={(event) => {
                    event.stopPropagation()
                    onTogglePin(session.id)
                  }}
                >
                  <PinIcon />
                </button>
              </span>
              <div className="session-body">
                {renamingId === session.id ? (
                  <RenameField
                    initial={name}
                    label={t('rename')}
                    onCancel={() => setRenamingId(null)}
                    onSave={(value) => {
                      onRename(session.id, value)
                      setRenamingId(null)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="session-name"
                    onDoubleClick={(event) => {
                      event.stopPropagation()
                      setRenamingId(session.id)
                    }}
                    title={t('rename')}
                  >
                    {name}
                  </button>
                )}
                <div className="session-sub">
                  <i className={cx('dot', `is-${session.phase}`)} title={reason} />
                  <span>{phase}</span>
                  <span className="sep">·</span>
                  <span className="path" title={session.cwd}>
                    {shortenPath(session.cwd, home)}
                  </span>
                </div>
                <div className="session-meta">
                  {shellLabel(locale, session.labelKey)}
                  {showReasons ? <span className="reason">{reason}</span> : null}
                </div>
              </div>
              {session.badge ? <span className="badge" title={t('badge')} /> : null}
              <div className="session-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('rename')}
                  onClick={(event) => {
                    event.stopPropagation()
                    setRenamingId(session.id)
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('close')}
                  onClick={(event) => {
                    event.stopPropagation()
                    onClose(session)
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <footer className="sidebar-foot">
        <button type="button" className="btn btn-ghost" data-testid="open-settings" onClick={onOpenSettings}>
          {t('settings')}
        </button>
        <span>{t('version', { version })}</span>
      </footer>
    </aside>
  )
}

function RenameField({
  initial,
  label,
  onSave,
  onCancel,
}: {
  initial: string
  label: string
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const skip = useRef(false)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <input
      ref={ref}
      className="rename"
      aria-label={label}
      defaultValue={initial}
      maxLength={80}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          onSave(event.currentTarget.value)
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          skip.current = true
          onCancel()
        }
      }}
      onBlur={(event) => {
        if (skip.current) return
        onSave(event.target.value)
      }}
    />
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.4" y="2" width="5.4" height="12" rx="1.1" />
      <rect x="9.2" y="2" width="5.4" height="12" rx="1.1" />
    </svg>
  )
}
