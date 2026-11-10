import { describe, expect, it } from 'vitest'
import {
  ActivityTracker,
  TitleParser,
  classifyTitle,
  clampStatusConfig,
  defaultStatusConfig,
  detectSessionStatus,
  effectiveTitleSignal,
  hasBusyMarker,
  hasIdlePrompt,
  looksLikeShellPrompt,
  shouldNotify,
  stabilizePhase,
  stripAnsi,
} from './status'
import type { StatusInput } from './types'

const cfg = defaultStatusConfig

function input(partial: Partial<StatusInput> & Pick<StatusInput, 'now'>): StatusInput {
  return {
    startedAt: partial.now - 10_000,
    exited: false,
    lastOutputAt: partial.now - 5_000,
    lastActivityAt: partial.now - 5_000,
    visibleText: '',
    title: '',
    titleChangedAt: null,
    screenMode: 'normal',
    hasActiveChild: null,
    ...partial,
  }
}

describe('stripAnsi', () => {
  it('removes color and title sequences', () => {
    expect(stripAnsi('\u001B[32mok\u001B[0m')).toBe('ok')
    expect(stripAnsi('pre\u001B]0;title\u0007post')).toBe('prepost')
  })
})

describe('prompts and markers', () => {
  it('recognizes shell and Codex prompts', () => {
    expect(looksLikeShellPrompt('› ')).toBe(true)
    expect(looksLikeShellPrompt('❯ refactor the parser')).toBe(true)
    expect(looksLikeShellPrompt('PS C:\\Users\\ada>')).toBe(true)
    expect(looksLikeShellPrompt('C:\\Users\\ada>')).toBe(true)
    expect(looksLikeShellPrompt('ada@mac ~/src %')).toBe(true)
    expect(looksLikeShellPrompt('user@host:~/app$')).toBe(true)
    expect(looksLikeShellPrompt('>>>')).toBe(true)
    expect(looksLikeShellPrompt('This sentence ends with a period.')).toBe(false)
    expect(looksLikeShellPrompt('100%')).toBe(false)
    expect(looksLikeShellPrompt('')).toBe(false)
  })

  it('reads the last non-empty line and the recent screen for markers', () => {
    const screen = ['older thinking note', '', 'ada@mac ~/src %'].join('\n')
    expect(hasIdlePrompt(screen, cfg)).toBe(true)
    expect(hasBusyMarker('hello\n⠋ Working (4s · esc to interrupt)\n', cfg)).toBe(true)
    expect(hasBusyMarker('\u001B[33m⠋ Working\u001B[0m', cfg)).toBe(true)
  })

  it('applies extra user patterns and ignores a broken regex', () => {
    const custom = clampStatusConfig({
      extraIdlePatterns: ['^ready>'],
      extraBusyPatterns: ['['],
    })
    expect(hasIdlePrompt('ready> ', custom)).toBe(true)
    expect(hasBusyMarker('nothing to see', custom)).toBe(false)
  })
})

describe('titles', () => {
  it('classifies Codex titles', () => {
    expect(classifyTitle('⠋ Working — molo')).toBe('busy')
    expect(classifyTitle('Working')).toBe('busy')
    expect(classifyTitle('Action required — molo')).toBe('attention')
    expect(classifyTitle('~/src/molo')).toBe('unknown')
    expect(classifyTitle('')).toBe('unknown')
  })

  it('stops trusting a frozen busy title', () => {
    expect(effectiveTitleSignal('Working', 1_000, 2_000, cfg)).toBe('busy')
    expect(effectiveTitleSignal('Working', 1_000, 1_000 + cfg.titleBusyMaxMs + 1, cfg)).toBe('unknown')
    expect(effectiveTitleSignal('Action required', 1_000, 99_000, cfg)).toBe('attention')
  })
})

describe('TitleParser', () => {
  it('reads BEL and ST titles, including titles split across chunks', () => {
    const parser = new TitleParser()
    expect(parser.push('hello \u001B]0;')).toEqual([])
    expect(parser.push('⠋ Working\u0007 tail')).toEqual(['⠋ Working'])
    expect(parser.push('\u001B]2;Action required\u001B\\')).toEqual(['Action required'])
    expect(parser.push('\u001B]7;file://host/path\u0007')).toEqual([])
  })
})

describe('ActivityTracker', () => {
  it('ignores a single keystroke echo and catches bursts', () => {
    const tracker = new ActivityTracker()
    tracker.noteOutput(1_000, 'a', cfg)
    expect(tracker.lastOutputAt).toBe(1_000)
    expect(tracker.lastActivityAt).toBeNull()

    tracker.noteOutput(1_100, 'b', cfg)
    tracker.noteOutput(1_200, 'c', cfg)
    expect(tracker.lastActivityAt).toBe(1_200)
  })

  it('treats one large write as activity', () => {
    const tracker = new ActivityTracker()
    tracker.noteOutput(5_000, 'x'.repeat(cfg.burstBytes), cfg)
    expect(tracker.lastActivityAt).toBe(5_000)
  })

  it('does not join chunks that fall outside the window', () => {
    const tracker = new ActivityTracker()
    tracker.noteOutput(0, 'a', cfg)
    tracker.noteOutput(cfg.burstWindowMs + 50, 'b', cfg)
    tracker.noteOutput(cfg.burstWindowMs + 100, 'c', cfg)
    expect(tracker.lastActivityAt).toBeNull()
  })
})

describe('detectSessionStatus', () => {
  it('reports starting, then idle, when nothing has been printed', () => {
    expect(
      detectSessionStatus(input({ now: 1_000, startedAt: 900, lastOutputAt: null, lastActivityAt: null }), cfg).phase,
    ).toBe('starting')
    expect(
      detectSessionStatus(input({ now: 5_000, startedAt: 0, lastOutputAt: null, lastActivityAt: null }), cfg).phase,
    ).toBe('idle')
  })

  it('lets an exited process win over every other signal', () => {
    const result = detectSessionStatus(
      input({ now: 10_000, exited: true, title: '⠋ Working', titleChangedAt: 10_000, visibleText: 'Working' }),
      cfg,
    )
    expect(result).toEqual({ phase: 'exited', reason: 'process-exited' })
  })

  it('stays idle while the user types at a prompt', () => {
    const result = detectSessionStatus(
      input({
        now: 10_000,
        lastOutputAt: 9_900,
        lastActivityAt: null,
        visibleText: 'ada@mac ~/src %',
        hasActiveChild: false,
      }),
      cfg,
    )
    expect(result.reason).toBe('idle-prompt')
  })

  it('becomes busy on a burst and idle again once the prompt is quiet', () => {
    const busy = detectSessionStatus(
      input({
        now: 10_000,
        lastActivityAt: 9_800,
        visibleText: 'cargo test\nrunning 12 tests',
        hasActiveChild: true,
      }),
      cfg,
    )
    expect(busy).toEqual({ phase: 'busy', reason: 'recent-activity' })

    const idle = detectSessionStatus(
      input({
        now: 10_000,
        lastActivityAt: 10_000 - cfg.promptIdleTimeoutMs,
        visibleText: 'test result: ok\nada@mac ~/src %',
        hasActiveChild: false,
      }),
      cfg,
    )
    expect(idle).toEqual({ phase: 'idle', reason: 'idle-prompt' })
  })

  it('holds busy while a Working marker is still on screen', () => {
    const result = detectSessionStatus(
      input({
        now: 20_000,
        lastActivityAt: 20_000 - cfg.quietTimeoutMs - 100,
        visibleText: '› fix the sidebar\n⠋ Working (12s · esc to interrupt)',
        screenMode: 'alternate',
        hasActiveChild: true,
      }),
      cfg,
    )
    expect(result).toEqual({ phase: 'busy', reason: 'busy-marker' })
  })

  it('does not let a stale Working line hold forever', () => {
    const result = detectSessionStatus(
      input({
        now: 50_000,
        lastActivityAt: 50_000 - cfg.busyMarkerQuietMs - 1,
        visibleText: 'Thinking about the old turn\n› ',
        screenMode: 'alternate',
        hasActiveChild: true,
      }),
      cfg,
    )
    expect(result.phase).toBe('idle')
  })

  it('trusts a live Codex title over a quiet screen', () => {
    const result = detectSessionStatus(
      input({
        now: 8_000,
        lastActivityAt: 1_000,
        title: '⠙ Working — molo',
        titleChangedAt: 7_900,
        visibleText: '› \n',
        screenMode: 'alternate',
        hasActiveChild: true,
      }),
      cfg,
    )
    expect(result).toEqual({ phase: 'busy', reason: 'title-busy' })
  })

  it('marks Action required even during recent output', () => {
    const result = detectSessionStatus(
      input({
        now: 8_000,
        lastActivityAt: 7_950,
        title: 'Action required — molo',
        titleChangedAt: 7_900,
        visibleText: 'Allow this command?\n› yes',
        screenMode: 'alternate',
        hasActiveChild: true,
      }),
      cfg,
    )
    expect(result).toEqual({ phase: 'attention', reason: 'title-attention' })
  })

  it('sees an approval question on screen without a title', () => {
    const result = detectSessionStatus(
      input({
        now: 8_000,
        lastActivityAt: 4_000,
        visibleText: 'run tests?\n\nDo you want to proceed',
        screenMode: 'alternate',
        hasActiveChild: true,
      }),
      cfg,
    )
    expect(result).toEqual({ phase: 'attention', reason: 'screen-attention' })
  })

  it('keeps a silent normal-screen child busy, but not a quiet Codex TUI', () => {
    const compiling = detectSessionStatus(
      input({
        now: 10_000,
        lastActivityAt: 8_000,
        visibleText: 'gcc -c main.c',
        screenMode: 'normal',
        hasActiveChild: true,
      }),
      cfg,
    )
    expect(compiling).toEqual({ phase: 'busy', reason: 'active-child' })

    const codexIdle = detectSessionStatus(
      input({
        now: 10_000,
        lastActivityAt: 8_000,
        visibleText: '› \ngpt-5 · main',
        screenMode: 'alternate',
        hasActiveChild: true,
      }),
      cfg,
    )
    expect(codexIdle.phase).toBe('idle')
  })

  it('treats a shell with no children as waiting', () => {
    const result = detectSessionStatus(
      input({
        now: 10_000,
        lastActivityAt: 1_000,
        visibleText: 'some command output that is not a prompt',
        screenMode: 'normal',
        hasActiveChild: false,
      }),
      cfg,
    )
    expect(result).toEqual({ phase: 'idle', reason: 'shell-waiting' })
  })

  it('gives up on a silent child after the configured timeout', () => {
    const result = detectSessionStatus(
      input({
        now: 30_000,
        lastActivityAt: 30_000 - cfg.childQuietTimeoutMs - 5,
        visibleText: 'make',
        screenMode: 'normal',
        hasActiveChild: true,
      }),
      cfg,
    )
    expect(result.phase).toBe('idle')
  })
})

describe('stabilizePhase', () => {
  it('holds attention across a brief blink', () => {
    const held = stabilizePhase({ phase: 'attention', reason: 'title-attention' }, 0, 1_000, cfg.attentionHoldMs)
    expect(held.attentionUntil).toBe(1_000 + cfg.attentionHoldMs)
    const bridged = stabilizePhase({ phase: 'idle', reason: 'quiet' }, held.attentionUntil, 1_500, cfg.attentionHoldMs)
    expect(bridged.result).toEqual({ phase: 'attention', reason: 'attention-hold' })
  })

  it('drops the hold when work resumes', () => {
    const next = stabilizePhase({ phase: 'busy', reason: 'title-busy' }, 5_000, 2_000, cfg.attentionHoldMs)
    expect(next.result.phase).toBe('busy')
    expect(next.attentionUntil).toBe(0)
  })
})

describe('shouldNotify', () => {
  const base = {
    watching: false,
    busyStartedAt: 0,
    now: 5_000,
    minBusyForNotifyMs: cfg.minBusyForNotifyMs,
  }

  it('notifies when a real task goes idle out of view', () => {
    expect(shouldNotify({ ...base, previous: 'busy', next: 'idle' })).toBe(true)
  })

  it('skips the notification for a short command and when the session is on screen', () => {
    expect(shouldNotify({ ...base, previous: 'busy', next: 'idle', now: 500 })).toBe(false)
    expect(shouldNotify({ ...base, previous: 'busy', next: 'idle', watching: true })).toBe(false)
  })

  it('always notifies for action required, except while the user is watching', () => {
    expect(shouldNotify({ ...base, previous: 'busy', next: 'attention', now: 200 })).toBe(true)
    expect(shouldNotify({ ...base, previous: 'idle', next: 'attention' })).toBe(true)
    expect(shouldNotify({ ...base, previous: 'busy', next: 'attention', watching: true })).toBe(false)
  })

  it('does not notify for shell startup or a second idle after attention', () => {
    expect(shouldNotify({ ...base, previous: 'starting', next: 'idle' })).toBe(false)
    expect(shouldNotify({ ...base, previous: 'attention', next: 'idle' })).toBe(false)
    expect(shouldNotify({ ...base, previous: 'attention', next: 'attention' })).toBe(false)
  })
})

describe('clampStatusConfig', () => {
  it('fills defaults and clamps out-of-range numbers', () => {
    const next = clampStatusConfig({ quietTimeoutMs: 5, burstCount: 100, extraIdlePatterns: ['ok', 4 as unknown as string] })
    expect(next.quietTimeoutMs).toBe(200)
    expect(next.burstCount).toBe(20)
    expect(next.promptIdleTimeoutMs).toBe(cfg.promptIdleTimeoutMs)
    expect(next.extraIdlePatterns).toEqual(['ok'])
  })

  it('survives an empty payload', () => {
    expect(clampStatusConfig(null).quietTimeoutMs).toBe(cfg.quietTimeoutMs)
  })
})
