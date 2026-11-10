import type { Phase, StatusConfig, StatusInput, StatusResult, TitleSignal } from './types'

/**
 * Status detection for Molo.
 *
 * The detector is a pure function. The main process feeds it timestamps, the
 * parsed screen, the window title, and whether the shell has a live child.
 * Nothing here touches a PTY, so the rules can be unit-tested and tuned.
 *
 * Codex CLI (the Rust TUI) is the primary target:
 * - While a turn runs, the window title cycles a Braille spinner about every
 *   100ms and the screen shows "Working" / "esc to interrupt".
 * - When Codex needs the user (an approval or a question), the title becomes
 *   "Action required".
 * - When it is sitting at the composer, redraws stop. Silence then means idle.
 *
 * Other AI CLIs and ordinary shells use the same signals: output bursts,
 * a prompt on the last line, and (for non-TUI commands) a child process.
 */
export const defaultStatusConfig: StatusConfig = {
  quietTimeoutMs: 900,
  promptIdleTimeoutMs: 280,
  busyMarkerQuietMs: 12_000,
  childQuietTimeoutMs: 8_000,
  startupGraceMs: 800,
  titleBusyMaxMs: 3_000,
  burstBytes: 16,
  burstCount: 3,
  burstWindowMs: 500,
  minBusyForNotifyMs: 1_600,
  attentionHoldMs: 1_800,
  extraIdlePatterns: [],
  extraBusyPatterns: [],
  extraAttentionPatterns: [],
}

const LIMITS: Record<keyof Omit<StatusConfig, 'extraIdlePatterns' | 'extraBusyPatterns' | 'extraAttentionPatterns'>, [number, number]> = {
  quietTimeoutMs: [200, 30_000],
  promptIdleTimeoutMs: [50, 10_000],
  busyMarkerQuietMs: [500, 120_000],
  childQuietTimeoutMs: [500, 120_000],
  startupGraceMs: [0, 10_000],
  titleBusyMaxMs: [500, 60_000],
  burstBytes: [1, 500],
  burstCount: [1, 20],
  burstWindowMs: [50, 5_000],
  minBusyForNotifyMs: [0, 60_000],
  attentionHoldMs: [0, 10_000],
}

/** Ten-frame Braille spinner used by Codex, plus the classic CLI spinner. */
const SPINNER = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⣾⣽⣻⢿⡿⣟⣯⣷]/

const BUILTIN_BUSY = [
  /\bworking\b/i,
  /\bthinking\b/i,
  /\bplanning\b/i,
  /\bgenerating\b/i,
  /\bresponding\b/i,
  /esc to interrupt/i,
  /esc to cancel/i,
  SPINNER,
]

const BUILTIN_ATTENTION = [
  /action required/i,
  /approval needed/i,
  /waiting for (your |you\b|approval|input)/i,
  /input required/i,
  /do you want to proceed/i,
  /allow (this|the) (command|action|edit)/i,
]

export function clampStatusConfig(input: Partial<StatusConfig> | undefined | null): StatusConfig {
  const merged: StatusConfig = {
    ...defaultStatusConfig,
    ...(input ?? {}),
  }
  const next = { ...merged }
  for (const key of Object.keys(LIMITS) as Array<keyof typeof LIMITS>) {
    const [min, max] = LIMITS[key]
    const value = Number(merged[key])
    next[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : defaultStatusConfig[key]
  }
  next.extraIdlePatterns = sanitizePatternList(merged.extraIdlePatterns)
  next.extraBusyPatterns = sanitizePatternList(merged.extraBusyPatterns)
  next.extraAttentionPatterns = sanitizePatternList(merged.extraAttentionPatterns)
  return next
}

function sanitizePatternList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0 && item.length < 300).slice(0, 40)
}

export function stripAnsi(input: string): string {
  return input
    .replace(/\u001B\][\s\S]*?(?:\u0007|\u001B\\)/g, '')
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u001B[@-_]/g, '')
}

export function classifyTitle(title: string): TitleSignal {
  const text = title.trim()
  if (!text) return 'unknown'
  if (/action required/i.test(text) || /approval needed/i.test(text) || /input required/i.test(text)) {
    return 'attention'
  }
  if (SPINNER.test(text)) return 'busy'
  if (/\b(working|thinking|planning|generating|responding)\b/i.test(text)) return 'busy'
  return 'unknown'
}

/**
 * A busy title is only authoritative while the app keeps refreshing it.
 * Codex animates the spinner every ~100ms. A title stuck on "Working" after
 * a crash or a stale footer stops counting.
 */
export function effectiveTitleSignal(
  title: string,
  titleChangedAt: number | null,
  now: number,
  config: StatusConfig,
): TitleSignal {
  const signal = classifyTitle(title)
  if (signal === 'busy' && titleChangedAt != null && now - titleChangedAt > config.titleBusyMaxMs) {
    return 'unknown'
  }
  return signal
}

export function looksLikeShellPrompt(line: string): boolean {
  const text = line.trim()
  if (!text || text.length > 180) return false
  if (/^[❯›]\s?/.test(text)) return true
  if (/^(>>>|\.\.\.)\s*$/.test(text)) return true
  if (/^PS [A-Za-z]:\\.*>\s*$/.test(text)) return true
  if (/^[A-Za-z]:\\[^>]{0,120}>\s*$/.test(text)) return true
  if (/^[$#%>]\s*$/.test(text)) return true
  if (/^[\w.+-]+@[\w.-]+[:\s]\S{0,100}[$#%]\s*$/.test(text)) return true
  if (/(?:^|\s)[$#]\s*$/.test(text) && !/[.!?]/.test(text) && text.split(/\s+/).length <= 8) return true
  if (/(?:^|\s)%\s*$/.test(text) && !/\d%\s*$/.test(text) && !/[.!?]/.test(text) && text.split(/\s+/).length <= 8) {
    return true
  }
  if (/>\s*$/.test(text) && /[~\\/]/.test(text) && !/[.!?]/.test(text) && text.split(/\s+/).length <= 8) {
    return true
  }
  return false
}

export function lastNonEmptyLine(text: string): string {
  const lines = stripAnsi(text).split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (trimmed) return trimmed
  }
  return ''
}

function tail(text: string, count: number): string {
  return stripAnsi(text).split('\n').slice(-count).join('\n')
}

function compilePatterns(sources: string[]): RegExp[] {
  const compiled: RegExp[] = []
  for (const source of sources) {
    try {
      compiled.push(new RegExp(source, 'i'))
    } catch {
      // A bad user pattern must not break detection.
    }
  }
  return compiled
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

export function hasIdlePrompt(visibleText: string, config: StatusConfig): boolean {
  const line = lastNonEmptyLine(visibleText)
  if (!line) return false
  if (looksLikeShellPrompt(line)) return true
  return matchesAny(line, compilePatterns(config.extraIdlePatterns))
}

export function hasBusyMarker(visibleText: string, config: StatusConfig): boolean {
  const region = tail(visibleText, 10)
  if (!region.trim()) return false
  if (matchesAny(region, BUILTIN_BUSY)) return true
  return matchesAny(region, compilePatterns(config.extraBusyPatterns))
}

export function hasAttentionMarker(visibleText: string, config: StatusConfig): boolean {
  const region = tail(visibleText, 12)
  if (!region.trim()) return false
  if (matchesAny(region, BUILTIN_ATTENTION)) return true
  return matchesAny(region, compilePatterns(config.extraAttentionPatterns))
}

export function detectSessionStatus(input: StatusInput, config: StatusConfig): StatusResult {
  if (input.exited) return { phase: 'exited', reason: 'process-exited' }

  if (input.lastOutputAt == null) {
    if (input.now - input.startedAt < config.startupGraceMs) {
      return { phase: 'starting', reason: 'startup-grace' }
    }
    return { phase: 'idle', reason: 'no-output' }
  }

  const silent = input.lastActivityAt == null ? Number.POSITIVE_INFINITY : input.now - input.lastActivityAt
  const titleSignal = effectiveTitleSignal(input.title, input.titleChangedAt, input.now, config)
  const attention = hasAttentionMarker(input.visibleText, config)
  const busyMarker = hasBusyMarker(input.visibleText, config)
  const idlePrompt = hasIdlePrompt(input.visibleText, config)

  if (titleSignal === 'attention' || attention) {
    return {
      phase: 'attention',
      reason: titleSignal === 'attention' ? 'title-attention' : 'screen-attention',
    }
  }

  if (titleSignal === 'busy') {
    return { phase: 'busy', reason: 'title-busy' }
  }

  if (busyMarker && silent < config.busyMarkerQuietMs) {
    return { phase: 'busy', reason: 'busy-marker' }
  }

  if (idlePrompt && silent >= config.promptIdleTimeoutMs) {
    return { phase: 'idle', reason: 'idle-prompt' }
  }

  if (input.lastActivityAt != null && silent < config.quietTimeoutMs) {
    return { phase: 'busy', reason: 'recent-activity' }
  }

  // Child processes matter for ordinary commands (`sleep`, a quiet compiler).
  // A full-screen TUI such as Codex stays alive while it waits for the user,
  // so a child alone must not keep that screen busy.
  if (
    input.screenMode !== 'alternate' &&
    input.hasActiveChild === true &&
    !idlePrompt &&
    silent < config.childQuietTimeoutMs
  ) {
    return { phase: 'busy', reason: 'active-child' }
  }

  if (input.hasActiveChild === false && input.screenMode !== 'alternate') {
    return { phase: 'idle', reason: 'shell-waiting' }
  }

  return { phase: 'idle', reason: 'quiet' }
}

export function stabilizePhase(
  detected: StatusResult,
  attentionUntil: number,
  now: number,
  holdMs: number,
): { result: StatusResult; attentionUntil: number } {
  if (detected.phase === 'exited' || detected.phase === 'busy' || detected.phase === 'starting') {
    return { result: detected, attentionUntil: 0 }
  }
  if (detected.phase === 'attention') {
    return { result: detected, attentionUntil: now + holdMs }
  }
  if (now < attentionUntil) {
    return {
      result: { phase: 'attention', reason: 'attention-hold' },
      attentionUntil,
    }
  }
  return { result: detected, attentionUntil: 0 }
}

export function shouldNotify(args: {
  previous: Phase
  next: Phase
  watching: boolean
  busyStartedAt: number | null
  now: number
  minBusyForNotifyMs: number
}): boolean {
  if (args.watching) return false
  if (args.next === 'attention' && args.previous !== 'attention' && args.previous !== 'starting' && args.previous !== 'exited') {
    return true
  }
  if (args.next === 'idle' && args.previous === 'busy') {
    if (args.busyStartedAt == null) return true
    return args.now - args.busyStartedAt >= args.minBusyForNotifyMs
  }
  return false
}

/**
 * Turns raw PTY bytes into "something is happening" timestamps.
 * A single echoed keystroke is not activity. A burst, or one large write, is.
 */
export class ActivityTracker {
  lastOutputAt: number | null = null
  lastActivityAt: number | null = null
  private chunkTimes: number[] = []

  noteOutput(now: number, chunk: string, config: StatusConfig): void {
    this.lastOutputAt = now
    const recent = this.chunkTimes.filter((time) => now - time <= config.burstWindowMs)
    const countWithThis = recent.length + 1
    this.chunkTimes = recent.concat(now).slice(-40)
    if (chunk.length >= config.burstBytes || countWithThis >= config.burstCount) {
      this.lastActivityAt = now
    }
  }

  markActivity(now: number): void {
    this.lastActivityAt = now
    if (this.lastOutputAt == null) this.lastOutputAt = now
  }
}

/**
 * Incremental OSC parser. Codex publishes status through the window title:
 * ESC ] 0 ; title BEL    or    ESC ] 2 ; title ESC \
 */
export class TitleParser {
  private state: 'ground' | 'esc' | 'osc' | 'osc-esc' = 'ground'
  private osc = ''

  push(chunk: string): string[] {
    const titles: string[] = []
    for (const ch of chunk) {
      if (this.state === 'ground') {
        if (ch === '\u001B') this.state = 'esc'
        continue
      }
      if (this.state === 'esc') {
        this.state = ch === ']' ? 'osc' : 'ground'
        this.osc = ''
        continue
      }
      if (this.state === 'osc') {
        if (ch === '\u0007') {
          this.finish(titles)
          this.state = 'ground'
          continue
        }
        if (ch === '\u001B') {
          this.state = 'osc-esc'
          continue
        }
        if (this.osc.length < 2048) this.osc += ch
        continue
      }
      if (ch === '\\') this.finish(titles)
      this.state = 'ground'
      this.osc = ''
    }
    return titles
  }

  private finish(titles: string[]): void {
    const match = /^(?:0|2);([\s\S]*)$/.exec(this.osc)
    if (match) titles.push(match[1])
    this.osc = ''
  }
}
