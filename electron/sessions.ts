import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import type { BrowserWindow } from 'electron'
import type { IPty } from 'node-pty'
import type { Terminal } from '@xterm/headless'
import { listActiveParents } from './children'
import { createScreen, readScreen } from './screen'
import type { SettingsStore } from './settings'
import {
  ActivityTracker,
  TitleParser,
  classifyTitle,
  detectSessionStatus,
  shouldNotify,
  stabilizePhase,
} from '../src/shared/status'
import { translate } from '../src/shared/i18n'
import type {
  CreateResult,
  CreateSessionInput,
  Phase,
  ScreenMode,
  SessionInfo,
  ShellChoice,
  TerminalSnapshot,
} from '../src/shared/types'

const require = createRequire(import.meta.url)

const MAX_SESSIONS = 12
const MAX_BACKLOG = 300_000

type PtyModule = typeof import('node-pty')

function loadPty(): PtyModule | null {
  try {
    return require('node-pty') as PtyModule
  } catch (error) {
    console.error('node-pty failed to load', error)
    return null
  }
}

interface LiveSession {
  id: string
  name: string
  autoName: boolean
  index: number
  cwd: string
  shellId: string
  labelKey: string
  pid: number | null
  pty: IPty | null
  screen: Terminal | null
  parser: TitleParser
  tracker: ActivityTracker
  title: string
  titleChangedAt: number | null
  screenText: string
  screenMode: ScreenMode
  hasActiveChild: boolean | null
  backlog: string
  seq: number
  attentionUntil: number
  phase: Phase
  reason: string
  badge: boolean
  exitCode: number | null
  createdAt: number
  exited: boolean
  busySince: number | null
  closing: boolean
  error?: string
}

function childEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value !== 'string') continue
    if (key === 'ELECTRON_RUN_AS_NODE') continue
    env[key] = value
  }
  env.TERM = 'xterm-256color'
  env.COLORTERM = 'truecolor'
  env.TERM_PROGRAM = 'molo'
  if (!env.LANG && !env.LC_ALL) env.LANG = 'C.UTF-8'
  return env
}

export class SessionManager {
  private sessions = new Map<string, LiveSession>()
  private order: string[] = []
  private nextIndex = 1
  private watchingId: string | null = null
  private windowFocused = true
  private pty: PtyModule | null
  private statusTimer: NodeJS.Timeout
  private childTimer: NodeJS.Timeout
  private polling = false

  constructor(
    private deps: {
      getWindow: () => BrowserWindow | null
      settings: SettingsStore
      shells: ShellChoice[]
      home: string
      notify: (title: string, body: string, sessionId: string) => void
    },
  ) {
    this.pty = loadPty()
    this.statusTimer = setInterval(() => this.tick(), 400)
    this.childTimer = setInterval(() => void this.pollChildren(), 2500)
    void this.pollChildren()
  }

  dispose(): void {
    clearInterval(this.statusTimer)
    clearInterval(this.childTimer)
    for (const session of this.sessions.values()) {
      try {
        session.pty?.kill()
      } catch {
        // already gone
      }
      session.screen?.dispose()
    }
    this.sessions.clear()
  }

  list(): SessionInfo[] {
    return this.order.flatMap((id) => {
      const session = this.sessions.get(id)
      return session ? [this.toInfo(session)] : []
    })
  }

  ptyAvailable(): boolean {
    return this.pty != null
  }

  create(input: CreateSessionInput): CreateResult {
    if (!this.pty) return { ok: false, error: 'pty-missing' }
    if (this.sessions.size >= MAX_SESSIONS) return { ok: false, error: 'max-sessions' }

    const requestedId = input.shellId || this.deps.settings.data.lastShellId
    const shell = this.deps.shells.find((item) => item.id === requestedId) ?? this.deps.shells[0]
    if (!shell) return { ok: false, error: 'bad-shell' }

    const cwd = (input.cwd || this.deps.settings.data.lastCwd || this.deps.home).trim() || this.deps.home
    let directory = cwd
    try {
      // An Electron asar archive reports as a directory, but a child process cannot use it.
      const insideArchive = directory.includes(`${path.sep}app.asar`) || directory.endsWith(`${path.sep}app.asar`)
      if (insideArchive || !fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        return { ok: false, error: 'bad-cwd' }
      }
    } catch {
      return { ok: false, error: 'bad-cwd' }
    }

    const id = randomUUID()
    const index = this.nextIndex++
    const customName = input.name?.trim().slice(0, 80) ?? ''
    const session: LiveSession = {
      id,
      name: customName || `Terminal ${index}`,
      autoName: customName.length === 0,
      index,
      cwd: directory,
      shellId: shell.id,
      labelKey: shell.labelKey,
      pid: null,
      pty: null,
      screen: null,
      parser: new TitleParser(),
      tracker: new ActivityTracker(),
      title: '',
      titleChangedAt: null,
      screenText: '',
      screenMode: 'normal',
      hasActiveChild: null,
      backlog: '',
      seq: 0,
      attentionUntil: 0,
      phase: 'starting',
      reason: 'startup-grace',
      badge: false,
      exitCode: null,
      createdAt: Date.now(),
      exited: false,
      busySince: null,
      closing: false,
    }

    try {
      session.screen = createScreen(80, 24)
      session.pty = this.pty.spawn(shell.command, [...shell.args], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: directory,
        env: childEnv(),
      })
      session.pid = session.pty.pid
    } catch (error) {
      session.screen?.dispose()
      const message = error instanceof Error ? error.message : 'pty'
      return { ok: false, error: message || 'pty' }
    }

    session.pty.onData((data) => this.onData(session, data))
    session.pty.onExit(({ exitCode }) => this.onExit(session, exitCode))

    this.sessions.set(id, session)
    this.order.push(id)
    this.deps.settings.update({ lastShellId: shell.id, lastCwd: directory })
    this.push()
    void this.pollChildren()
    return { ok: true, session: this.toInfo(session) }
  }

  write(id: string, data: string): void {
    if (typeof data !== 'string' || !data) return
    const session = this.sessions.get(id)
    if (!session || session.exited) return
    const payload = data.length > 200_000 ? data.slice(0, 200_000) : data
    try {
      session.pty?.write(payload)
    } catch (error) {
      console.error('pty write failed', error)
    }
  }

  resize(id: string, cols: number, rows: number): void {
    if (!Number.isInteger(cols) || !Number.isInteger(rows)) return
    if (cols < 2 || rows < 2 || cols > 500 || rows > 200) return
    const session = this.sessions.get(id)
    if (!session || session.exited) return
    try {
      session.screen?.resize(cols, rows)
    } catch {
      // The headless screen is only a status aid.
    }
    try {
      session.pty?.resize(cols, rows)
    } catch (error) {
      console.error('pty resize failed', error)
    }
  }

  rename(id: string, name: string): void {
    const session = this.sessions.get(id)
    if (!session || typeof name !== 'string') return
    const trimmed = name.trim().slice(0, 80)
    if (!trimmed) return
    session.name = trimmed
    session.autoName = false
    this.push()
  }

  close(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    if (session.exited || !session.pty) {
      this.remove(id)
      return
    }
    session.closing = true
    try {
      session.pty.kill()
    } catch {
      this.remove(id)
      return
    }
    setTimeout(() => {
      if (this.sessions.has(id)) this.remove(id)
    }, 900)
  }

  subscribe(id: string): TerminalSnapshot {
    const session = this.sessions.get(id)
    if (!session) return { seq: 0, data: '' }
    return { seq: session.seq, data: session.backlog }
  }

  setWatching(id: string | null, windowFocused: boolean): void {
    this.watchingId = id
    this.windowFocused = windowFocused
    if (!id) return
    const session = this.sessions.get(id)
    if (session?.badge && windowFocused) {
      session.badge = false
      this.push()
    }
  }

  retick(): void {
    this.tick()
  }

  private onData(session: LiveSession, data: string): void {
    session.seq += 1
    session.backlog += data
    if (session.backlog.length > MAX_BACKLOG) {
      session.backlog = session.backlog.slice(session.backlog.length - 250_000)
    }
    const now = Date.now()
    const config = this.deps.settings.data.status
    for (const title of session.parser.push(data)) {
      session.title = title
      session.titleChangedAt = now
      if (classifyTitle(title) === 'busy') session.tracker.markActivity(now)
    }
    session.tracker.noteOutput(now, data, config)
    try {
      session.screen?.write(data)
    } catch {
      // Screen parsing is best-effort.
    }
    const win = this.deps.getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('terminal:data', { id: session.id, seq: session.seq, data })
    }
  }

  private onExit(session: LiveSession, exitCode: number): void {
    session.exited = true
    session.exitCode = exitCode
    session.phase = 'exited'
    session.reason = 'process-exited'
    session.hasActiveChild = false
    session.pid = null
    if (session.closing) this.remove(session.id)
    else this.push()
  }

  private remove(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    session.screen?.dispose()
    this.sessions.delete(id)
    this.order = this.order.filter((item) => item !== id)
    this.push()
  }

  private tick(): void {
    const now = Date.now()
    const settings = this.deps.settings.data
    const config = settings.status
    let changed = false
    for (const session of this.sessions.values()) {
      if (session.exited) continue
      if (session.screen) {
        try {
          const snap = readScreen(session.screen)
          session.screenText = snap.text
          session.screenMode = snap.mode
        } catch {
          session.screenMode = 'unknown'
        }
      }
      const detected = detectSessionStatus(
        {
          now,
          startedAt: session.createdAt,
          exited: false,
          lastOutputAt: session.tracker.lastOutputAt,
          lastActivityAt: session.tracker.lastActivityAt,
          visibleText: session.screenText,
          title: session.title,
          titleChangedAt: session.titleChangedAt,
          screenMode: session.screenMode,
          hasActiveChild: session.hasActiveChild,
        },
        config,
      )
      const stable = stabilizePhase(detected, session.attentionUntil, now, config.attentionHoldMs)
      session.attentionUntil = stable.attentionUntil
      if (stable.result.phase === session.phase && stable.result.reason === session.reason) continue

      const previous = session.phase
      const next = stable.result.phase
      if (previous !== 'busy' && next === 'busy') session.busySince = now
      const watching = this.windowFocused && this.watchingId === session.id
      if (
        shouldNotify({
          previous,
          next,
          watching,
          busyStartedAt: session.busySince,
          now,
          minBusyForNotifyMs: config.minBusyForNotifyMs,
        })
      ) {
        if (settings.notifyBadge) session.badge = true
        if (settings.notifyDesktop) this.notify(session, next)
      }
      if (next === 'busy' || next === 'starting') session.badge = false
      session.phase = next
      session.reason = stable.result.reason
      changed = true
    }
    if (changed) this.push()
  }

  private notify(session: LiveSession, phase: Phase): void {
    const locale = this.deps.settings.data.locale
    const name = this.displayName(session)
    if (phase === 'attention') {
      this.deps.notify(
        translate(locale, 'notifyAttentionTitle'),
        translate(locale, 'notifyAttentionBody', { name }),
        session.id,
      )
      return
    }
    this.deps.notify(translate(locale, 'notifyIdleTitle'), translate(locale, 'notifyIdleBody', { name }), session.id)
  }

  private displayName(session: LiveSession): string {
    if (!session.autoName) return session.name
    return translate(this.deps.settings.data.locale, 'defaultSession', { n: session.index })
  }

  private async pollChildren(): Promise<void> {
    if (this.polling) return
    const live = [...this.sessions.values()].filter((session) => !session.exited && session.pid)
    if (live.length === 0) return
    this.polling = true
    try {
      const parents = await listActiveParents()
      for (const session of live) {
        if (session.pid) session.hasActiveChild = parents.has(session.pid)
      }
    } catch (error) {
      console.error('child process snapshot failed', error)
      for (const session of live) session.hasActiveChild = null
    } finally {
      this.polling = false
    }
  }

  private push(): void {
    const win = this.deps.getWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send('sessions:updated', this.list())
  }

  private toInfo(session: LiveSession): SessionInfo {
    return {
      id: session.id,
      name: session.name,
      autoName: session.autoName,
      index: session.index,
      cwd: session.cwd,
      shellId: session.shellId,
      labelKey: session.labelKey,
      pid: session.pid,
      phase: session.phase,
      reason: session.reason,
      badge: session.badge,
      exitCode: session.exitCode,
      createdAt: session.createdAt,
      error: session.error,
    }
  }
}
