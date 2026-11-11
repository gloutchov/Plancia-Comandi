export type Phase = 'starting' | 'busy' | 'idle' | 'attention' | 'exited'

export type ThemeSetting = 'system' | 'light' | 'dark'

export type Locale = 'it' | 'en'

export type LayoutMode = 'single' | 'split' | 'stack' | 'grid'

export type ScreenMode = 'normal' | 'alternate' | 'unknown'

export type TitleSignal = 'busy' | 'attention' | 'unknown'

export interface StatusConfig {
  /** Silence after real output before a session with no other signal becomes idle. */
  quietTimeoutMs: number
  /** Silence required before a recognized shell/Codex prompt counts as idle. */
  promptIdleTimeoutMs: number
  /**
   * How long a busy phrase still on screen ("Working", "esc to interrupt", a spinner)
   * keeps the session busy after output pauses.
   */
  busyMarkerQuietMs: number
  /**
   * On a normal (non-TUI) screen, how long a silent child process keeps the session
   * busy. Full-screen TUIs such as Codex ignore this and use title + markers instead.
   */
  childQuietTimeoutMs: number
  /** Before the first byte, the session stays in "starting". */
  startupGraceMs: number
  /**
   * A busy window title (Codex spinner / "Working") is trusted only while it keeps
   * changing. A frozen title is ignored after this long.
   */
  titleBusyMaxMs: number
  /** Output at least this large counts as activity on its own (not a keystroke echo). */
  burstBytes: number
  /** This many chunks inside `burstWindowMs` count as activity even if each is small. */
  burstCount: number
  burstWindowMs: number
  /** Busy periods shorter than this do not raise an "idle again" notification. */
  minBusyForNotifyMs: number
  /** How long to keep "action required" when the title blinks away for a moment. */
  attentionHoldMs: number
  /** Extra JavaScript regex sources, tested against the last non-empty line. */
  extraIdlePatterns: string[]
  /** Extra regex sources, tested against the last lines of the screen. */
  extraBusyPatterns: string[]
  /** Extra regex sources, tested against the last lines of the screen. */
  extraAttentionPatterns: string[]
}

export interface AppSettings {
  theme: ThemeSetting
  locale: Locale
  layout: LayoutMode
  fontSize: number
  notifyDesktop: boolean
  notifyBadge: boolean
  showReasons: boolean
  lastShellId: string
  lastCwd: string
  status: StatusConfig
}

export type SettingsPatch = Omit<Partial<AppSettings>, 'status'> & {
  status?: Partial<StatusConfig>
}

export interface ShellChoice {
  id: string
  command: string
  args: string[]
  labelKey: string
}

export interface SessionInfo {
  id: string
  name: string
  autoName: boolean
  index: number
  cwd: string
  shellId: string
  labelKey: string
  pid: number | null
  phase: Phase
  reason: string
  badge: boolean
  exitCode: number | null
  createdAt: number
  error?: string
}

export type CreateResult =
  | { ok: true; session: SessionInfo }
  | { ok: false; error: string }

export interface BootInfo {
  platform: NodeJS.Platform
  home: string
  version: string
  demo: boolean
  systemDark: boolean
  settings: AppSettings
  sessions: SessionInfo[]
  shells: ShellChoice[]
  limits: {
    maxPasteChars: number
    maxDroppedFiles: number
    maxPathChars: number
  }
}

export interface CreateSessionInput {
  name?: string
  shellId?: string
  cwd?: string
}

export interface TerminalSnapshot {
  seq: number
  data: string
}

export interface TerminalChunk {
  id: string
  seq: number
  data: string
}

export interface StatusInput {
  now: number
  startedAt: number
  exited: boolean
  lastOutputAt: number | null
  lastActivityAt: number | null
  visibleText: string
  title: string
  titleChangedAt: number | null
  screenMode: ScreenMode
  hasActiveChild: boolean | null
}

export interface StatusResult {
  phase: Phase
  reason: string
}
