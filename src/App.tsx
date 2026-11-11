import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { NewSessionDialog } from './components/NewSessionDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { Sidebar } from './components/Sidebar'
import { TerminalView } from './components/TerminalView'
import { LayoutSwitcher } from './components/LayoutSwitcher'
import { cx } from './cx'
import { phaseKey, reasonKey, translate, type MessageKey } from './shared/i18n'
import { displayedLayout, layoutCapacity, nextLayout, selectVisibleSessions } from './shared/layout'
import { shortenPath } from './shared/paths'
import { appShortcut, type KeyLike } from './shortcuts'
import { darkTerm, lightTerm } from './termTheme'
import {
  copyFocusedTerminal,
  pasteFocusedTerminal,
  selectAllFocusedTerminal,
  setFocusedTerminal,
  terminalHasFocus,
} from './terminalEdit'
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
    // Settings are not loaded yet. The app default locale is Italian.
    const gate = (key: 'appName' | 'openDesktop' | 'bootError' | 'loading') => translate('it', key)
    const detail =
      error === 'desktop' ? gate('openDesktop') : error === 'boot' ? gate('bootError') : error ?? gate('loading')
    return (
      <div className="gate">
        <strong>{gate('appName')}</strong>
        <p>{detail}</p>
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
    setFocusedId(sessions[0]?.id ?? null)
  }, [boot.demo, sessions])

  const displayed = displayedLayout(layout, sessions.length)
  const slots = selectVisibleSessions(
    sessions.map((session) => session.id),
    focusedId,
    layoutCapacity(displayed),
  )
  const visibleIds = new Set(slots.filter((id): id is string => id !== null))
  const countRef = useRef(sessions.length)

  useEffect(() => {
    const previous = countRef.current
    countRef.current = sessions.length
    if (sessions.length >= previous) return
    const next = displayedLayout(layout, sessions.length)
    if (next !== layout) {
      setLayoutState(next)
      saveSettings({ layout: next })
    }
  }, [sessions.length, layout])

  function saveSettings(patch: SettingsPatch) {
    setSettings((current) => ({
      ...current,
      ...patch,
      status: patch.status ? { ...current.status, ...patch.status } : current.status,
    }))
    void window.plancia?.updateSettings(patch).then(setSettings)
  }

  function setLayout(mode: LayoutMode) {
    if (displayedLayout(mode, sessions.length) !== mode) return
    setLayoutState(mode)
    saveSettings({ layout: mode })
  }

  function showSideBySide(id: string) {
    if (sessions.length < 2) return
    setFocusedId(id)
    setLayout('split')
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
    if (action === 'split') setLayout(nextLayout(displayed, sessions.length))
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

  useEffect(() => {
    setFocusedTerminal(focusedId)
  }, [focusedId])

  useEffect(() => {
    const prevent = (event: DragEvent) => {
      event.preventDefault()
    }
    window.addEventListener('dragover', prevent, true)
    window.addEventListener('drop', prevent, true)
    return () => {
      window.removeEventListener('dragover', prevent, true)
      window.removeEventListener('drop', prevent, true)
    }
  }, [])

  useEffect(() => {
    return window.plancia?.onEditCommand(async (command, id) => {
      if (command === 'copy') return copyFocusedTerminal()
      if (command === 'paste') return pasteFocusedTerminal(boot.limits, `edit:${id}`)
      if (command === 'selectAll') return selectAllFocusedTerminal()
      if (command === 'cut' || command === 'undo' || command === 'redo') return terminalHasFocus()
      return false
    })
  }, [boot.limits])

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
          visibleIds={visibleIds}
          canSplit={sessions.length >= 2}
          showReasons={settings.showReasons}
          darwin={boot.platform === 'darwin'}
          onFocus={(id) => {
            setFocusedId(id)
            if (narrow) setSidebarOpen(false)
          }}
          onTogglePin={showSideBySide}
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
          <LayoutSwitcher
            layout={displayed}
            groupLabel={t('layoutViews')}
            labels={{
              single: t('layoutSingle'),
              split: t('layoutSplit'),
              stack: t('layoutStack'),
              grid: t('layoutGrid'),
            }}
            disabledReasons={{
              split: sessions.length < 2 ? t('layoutNeedTwo') : undefined,
              stack: sessions.length < 2 ? t('layoutNeedTwo') : undefined,
              grid: sessions.length < 3 ? t('layoutNeedThree') : undefined,
            }}
            onSelect={setLayout}
          />
        </header>
        {visibleIds.size === 0 ? (
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
          <div className="tiles" data-layout={displayed}>
            {slots.map((id, index) => {
              if (!id) return <div key={`empty-${index}`} className="tile tile-empty" aria-hidden="true" />
              const session = sessions.find((item) => item.id === id)
              if (!session) return null
              const active = id === focusedId
              return (
                <section key={id} className={cx('tile', active && 'is-active', `tone-${session.phase}`)}>
                  <header className="tile-bar">
                    <i className={cx('dot', `is-${session.phase}`)} />
                    <strong>{sessionName(session)}</strong>
                    <span>{t(phaseKey(session.phase))}</span>
                  </header>
                  <TerminalView
                    sessionId={id}
                    shellId={session.shellId}
                    theme={termTheme}
                    fontSize={settings.fontSize}
                    active={active && !newOpen && !settingsOpen && !pendingClose}
                    platform={boot.platform}
                    limits={boot.limits}
                    fitToken={displayed}
                    copyLabel={t('menuCopy')}
                    pasteLabel={t('menuPaste')}
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
