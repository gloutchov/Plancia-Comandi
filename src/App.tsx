import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { NewSessionDialog } from './components/NewSessionDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { Sidebar } from './components/Sidebar'
import { TerminalView } from './components/TerminalView'
import { cx } from './cx'
import { phaseKey, reasonKey, shortcutLabels, translate, type MessageKey } from './shared/i18n'
import { shortenPath } from './shared/paths'
import { appShortcut, type KeyLike } from './shortcuts'
import { darkTerm, lightTerm } from './termTheme'
import type { AppSettings, BootInfo, LayoutMode, SessionInfo, SettingsPatch } from './shared/types'

export function App() {
  const [boot, setBoot] = useState<BootInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.plancia) {
      setError('desktop')
      return
    }
    window.plancia.boot().then(setBoot).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'boot')
    })
  }, [])

  if (!boot) {
    return (
      <div className="gate">
        <strong>Plancia Comandi</strong>
        <p>{error === 'desktop' ? 'Apri Plancia Comandi dalla finestra dell’app.' : error ?? 'Caricamento…'}</p>
      </div>
    )
  }

  return <Workspace boot={boot} />
}

function Workspace({ boot }: { boot: BootInfo }) {
  const [settings, setSettings] = useState<AppSettings>(boot.settings)
  const [sessions, setSessions] = useState<SessionInfo[]>(boot.sessions)
  const [systemDark, setSystemDark] = useState(boot.systemDark)
  const [focusedId, setFocusedId] = useState<string | null>(boot.sessions[0]?.id ?? null)
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [layout, setLayoutState] = useState<LayoutMode>(boot.settings.layout)
  const [newOpen, setNewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingClose, setPendingClose] = useState<SessionInfo | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 860px)').matches)
  const demoApplied = useRef(false)

  const locale = settings.locale
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars)
  const resolved = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme
  const termTheme = resolved === 'dark' ? darkTerm : lightTerm
  const focused = sessions.find((session) => session.id === focusedId) ?? null

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.documentElement.lang = locale
    document.documentElement.dataset.platform = boot.platform
  }, [resolved, locale, boot.platform])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)')
    const onChange = () => setNarrow(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const bridge = window.plancia
    if (!bridge) return
    const offSessions = bridge.onSessions(setSessions)
    const offTheme = bridge.onSystemTheme(setSystemDark)
    const offSettings = bridge.onSettings(setSettings)
    const offFocus = bridge.onFocus((id) => {
      setFocusedId(id)
      setSidebarOpen(false)
    })
    return () => {
      offSessions()
      offTheme()
      offSettings()
      offFocus()
    }
  }, [])

  useEffect(() => {
    if (focusedId && sessions.some((session) => session.id === focusedId)) return
    setFocusedId(sessions[0]?.id ?? null)
  }, [sessions, focusedId])

  useEffect(() => {
    setPinned((current) => {
      const alive = new Set(sessions.map((session) => session.id))
      const next = new Set([...current].filter((id) => alive.has(id)))
      return next.size === current.size ? current : next
    })
  }, [sessions])

  useEffect(() => {
    window.plancia?.setWatching(focusedId, document.hasFocus())
    const send = () => window.plancia?.setWatching(focusedId, document.hasFocus())
    window.addEventListener('focus', send)
    window.addEventListener('blur', send)
    return () => {
      window.removeEventListener('focus', send)
      window.removeEventListener('blur', send)
    }
  }, [focusedId])

  useEffect(() => {
    if (!boot.demo || demoApplied.current || sessions.length < 2) return
    demoApplied.current = true
    setLayoutState('split')
    setPinned(new Set(sessions.map((session) => session.id)))
    setFocusedId(sessions[0]?.id ?? null)
  }, [boot.demo, sessions])

  const visibleIds = useMemo(() => {
    if (layout === 'single') return focusedId ? [focusedId] : []
    const ids = sessions.map((session) => session.id).filter((id) => pinned.has(id) || id === focusedId)
    return ids.length > 0 ? ids : focusedId ? [focusedId] : []
  }, [layout, sessions, pinned, focusedId])

  const columns = visibleIds.length <= 1 ? 1 : visibleIds.length <= 4 ? 2 : 3
  const shortcuts = shortcutLabels(boot.platform)

  function saveSettings(patch: SettingsPatch) {
    setSettings((current) => ({
      ...current,
      ...patch,
      status: patch.status ? { ...current.status, ...patch.status } : current.status,
    }))
    void window.plancia?.updateSettings(patch).then(setSettings)
  }

  function setLayout(mode: LayoutMode) {
    setLayoutState(mode)
    saveSettings({ layout: mode })
    if (mode === 'split') {
      setPinned((current) => (current.size > 0 ? current : new Set(focusedId ? [focusedId] : [])))
    }
  }

  function togglePin(id: string) {
    setPinned((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setFocusedId(id)
    if (layout !== 'split') setLayout('split')
  }

  function requestClose(session: SessionInfo) {
    if (session.phase === 'busy' || session.phase === 'attention') setPendingClose(session)
    else void window.plancia?.closeSession(session.id)
  }

  function closeNow(session: SessionInfo) {
    setPendingClose(null)
    void window.plancia?.closeSession(session.id)
  }

  function dismissDialogs() {
    if (!newOpen && !settingsOpen && !pendingClose) return false
    setNewOpen(false)
    setSettingsOpen(false)
    setPendingClose(null)
    return true
  }

  const actions = useRef<{
    shortcut: (event: KeyLike) => void
    escape: () => boolean
  }>({
    shortcut: () => undefined,
    escape: () => false,
  })
  actions.current.escape = dismissDialogs
  actions.current.shortcut = (event) => {
    if (newOpen || settingsOpen || pendingClose) return
    const action = appShortcut(event, boot.platform)
    if (!action) return
    if (action === 'new') setNewOpen(true)
    if (action === 'close' && focused) requestClose(focused)
    if (action === 'split') setLayout(layout === 'single' ? 'split' : 'single')
    if (action === 'settings') setSettingsOpen(true)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('.xterm')) return
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          if (event.key === 'Escape') dismissDialogs()
          return
        }
      }
      if (event.key === 'Escape' && dismissDialogs()) {
        event.preventDefault()
        return
      }
      const key: KeyLike = {
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      }
      if (!appShortcut(key, boot.platform)) return
      event.preventDefault()
      actions.current.shortcut(key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function createError(code: string): string {
    if (code === 'bad-cwd') return t('badCwd')
    if (code === 'bad-shell') return t('badShell')
    if (code === 'max-sessions') return t('maxSessions', { n: 12 })
    if (code === 'pty-missing') return t('ptyMissing')
    return code || t('createFailed')
  }

  const sessionName = (session: SessionInfo) =>
    session.autoName ? t('defaultSession', { n: session.index }) : session.name

  return (
    <div className={cx('app', boot.platform === 'darwin' && 'is-darwin')}>
      {narrow && sidebarOpen ? <button type="button" className="scrim" aria-label={t('close')} onClick={() => setSidebarOpen(false)} /> : null}
      <div className={cx('sidebar-slot', narrow && sidebarOpen && 'is-open')}>
        <Sidebar
          locale={locale}
          home={boot.home}
          version={boot.version}
          sessions={sessions}
          focusedId={focusedId}
          pinned={pinned}
          showReasons={settings.showReasons}
          darwin={boot.platform === 'darwin'}
          onFocus={(id) => {
            setFocusedId(id)
            if (narrow) setSidebarOpen(false)
          }}
          onTogglePin={togglePin}
          onClose={requestClose}
          onRename={(id, name) => void window.plancia?.renameSession(id, name)}
          onCreate={() => setNewOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>
      <main className="stage">
        <header className="toolbar">
          {narrow ? (
            <button type="button" className="icon-btn menu-btn" aria-label={t('sidebarToggle')} onClick={() => setSidebarOpen((open) => !open)}>
              ☰
            </button>
          ) : null}
          <div className="toolbar-title">
            <strong>{focused ? sessionName(focused) : t('appName')}</strong>
            {focused ? (
              <span title={t(reasonKey(focused.reason))}>
                <i className={cx('dot', `is-${focused.phase}`)} />
                {t(phaseKey(focused.phase))}
                <span className="sep">·</span>
                {shortenPath(focused.cwd, boot.home)}
              </span>
            ) : (
              <span>{t('emptyBody')}</span>
            )}
          </div>
          <div className="segmented" role="radiogroup" aria-label={t('layoutSplit')}>
            <button
              type="button"
              role="radio"
              aria-checked={layout === 'single'}
              className={layout === 'single' ? 'is-on' : ''}
              title={shortcuts.split}
              onClick={() => setLayout('single')}
            >
              {t('layoutSingle')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={layout === 'split'}
              data-testid="layout-split"
              className={layout === 'split' ? 'is-on' : ''}
              title={shortcuts.split}
              onClick={() => setLayout('split')}
            >
              {t('layoutSplit')}
            </button>
          </div>
        </header>
        {visibleIds.length === 0 ? (
          <div className="empty-stage">
            <div className="empty-card">
              <h2>{t('emptyTitle')}</h2>
              <p>{t('emptyBody')}</p>
              <button type="button" className="btn btn-primary" onClick={() => setNewOpen(true)}>
                {t('newSession')}
              </button>
            </div>
          </div>
        ) : (
          <div className="tiles" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {visibleIds.map((id) => {
              const session = sessions.find((item) => item.id === id)
              if (!session) return null
              const active = id === focusedId
              return (
                <section key={id} className={cx('tile', active && 'is-active', `tone-${session.phase}`)}>
                  <header className="tile-bar">
                    <i className={cx('dot', `is-${session.phase}`)} />
                    <strong>{sessionName(session)}</strong>
                    <span>{t(phaseKey(session.phase))}</span>
                    {layout === 'split' && pinned.has(id) ? (
                      <button type="button" className="text-btn" onClick={() => togglePin(id)}>
                        {t('removeFromView')}
                      </button>
                    ) : null}
                  </header>
                  <TerminalView
                    sessionId={id}
                    theme={termTheme}
                    fontSize={settings.fontSize}
                    active={active && !newOpen && !settingsOpen && !pendingClose}
                    platform={boot.platform}
                    onActivate={() => setFocusedId(id)}
                    onShortcut={(event) => actions.current.shortcut(event)}
                    onEscape={() => actions.current.escape()}
                  />
                  {session.phase === 'exited' ? (
                    <div className="exit-banner">{t('exitedCode', { code: session.exitCode ?? 0 })}</div>
                  ) : null}
                </section>
              )
            })}
          </div>
        )}
        {layout === 'split' && visibleIds.length < 2 ? <p className="split-hint">{t('splitHint')}</p> : null}
      </main>

      {newOpen ? (
        <NewSessionDialog
          locale={locale}
          shells={boot.shells}
          initialShellId={settings.lastShellId || boot.shells[0]?.id || ''}
          initialCwd={settings.lastCwd || boot.home}
          onCancel={() => setNewOpen(false)}
          onCreate={async (input) => {
            const result = await window.plancia!.createSession(input)
            if (!result.ok) return createError(result.error)
            setFocusedId(result.session.id)
            if (layout === 'split') {
              setPinned((current) => new Set(current).add(result.session.id))
            }
            setNewOpen(false)
            if (narrow) setSidebarOpen(false)
            return null
          }}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsDialog
          locale={locale}
          platform={boot.platform}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onChange={saveSettings}
        />
      ) : null}

      {pendingClose ? (
        <ConfirmDialog
          title={t('confirmCloseTitle')}
          body={t(pendingClose.phase === 'attention' ? 'confirmCloseAttention' : 'confirmCloseBody', {
            name: sessionName(pendingClose),
          })}
          confirmLabel={t('close')}
          cancelLabel={t('cancel')}
          onCancel={() => setPendingClose(null)}
          onConfirm={() => closeNow(pendingClose)}
        />
      ) : null}
    </div>
  )
}
