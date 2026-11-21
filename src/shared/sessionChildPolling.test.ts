import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { BrowserWindow } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionManager } from '../../electron/sessions'
import { listActiveParents } from '../../electron/children'
import { defaultSettings, type SettingsStore } from '../../electron/settings'
import { APP_CONFIG_DEFAULTS, loadAppConfig, validateAppConfig, type SessionLimits } from './appConfig'
import { readScreen } from '../../electron/screen'
import { translate } from './i18n'
import { runTaskkill } from './windowsShellClose'

vi.mock('../../electron/children', () => ({ listActiveParents: vi.fn() }))
vi.mock('../../electron/screen', () => ({
  createScreen: () => ({ dispose: vi.fn(), write: vi.fn(), resize: vi.fn() }),
  readScreen: vi.fn(() => ({ text: '', mode: 'normal' })),
}))
vi.mock('../../electron/diagnostics', () => ({ reportDiagnostic: vi.fn() }))
vi.mock('./windowsShellClose', () => ({
  closeShellTree: async (_platform: unknown, _pid: unknown, kill: () => void) => { kill() },
  runTaskkill: vi.fn(),
}))

let root: string
let manager: SessionManager
let pid: number
let outputs: ((data: string) => void)[]
let exits: ((event: {exitCode: number}) => void)[]
let deps: ConstructorParameters<typeof SessionManager>[0]
let pty: typeof import('node-pty')
const read = vi.mocked(listActiveParents)
const send = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(100_000)
  pid = 42
  outputs = []
  exits = []
  vi.mocked(readScreen).mockClear()
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'plancia-m32-test-'))
  read.mockReset().mockResolvedValue(new Set())
  send.mockReset()
  const settings = { data: { ...defaultSettings(root), notifyDesktop: false, notifyBadge: false }, update: vi.fn() } as unknown as SettingsStore
  const spawn = vi.fn(() => {
    let onExit: (event: { exitCode: number }) => void = () => undefined
    return {
      pid: pid++, onData: (listener: (data: string) => void) => { outputs.push(listener); return { dispose() {} } },
      onExit: (listener: typeof onExit) => { onExit = listener; exits.push(listener); return { dispose() {} } },
      kill: () => onExit({ exitCode: 0 }), write: vi.fn(), resize: vi.fn(),
    }
  })
  deps = {
    getWindow: () => ({ isDestroyed: () => false, webContents: { send } }) as unknown as BrowserWindow,
    settings, shells: [{ id: 'test', labelKey: 'shellLogin', command: 'synthetic-shell', args: [] }],
    home: root, notify: vi.fn(), maxWriteChars: 200_000,
    statusPatternLimits: APP_CONFIG_DEFAULTS.statusPatterns, childPollingLimits: APP_CONFIG_DEFAULTS.childPolling, sessionLimits: APP_CONFIG_DEFAULTS.sessions, processSnapshotLimits: APP_CONFIG_DEFAULTS.processSnapshot,
  }
  pty = { spawn } as unknown as typeof import('node-pty')
  manager = new SessionManager(deps, pty)
})
afterEach(() => {
  manager.dispose()
  vi.clearAllTimers()
  vi.useRealTimers()
  fs.rmSync(root, { recursive: true, force: true })
})

function create() {
  const result = manager.create({ shellId: 'test', cwd: root })
  if (!result.ok) throw new Error('Synthetic session failed')
  return result.session.id
}

describe('session process detection integration', () => {
  function configure(overrides: Partial<SessionLimits>) {
    manager.dispose()
    const configFile = path.join(root, 'app.config.json')
    fs.writeFileSync(configFile, JSON.stringify({ sessions: overrides }))
    manager = new SessionManager({ ...deps, sessionLimits: loadAppConfig(configFile).sessions }, pty)
  }
  it('enforces the configured cap, including exited sessions until removal', async () => {
    configure({ maxSessions: 2 })
    const first = create(); create()
    expect(manager.create({ cwd: root })).toEqual({ ok: false, error: 'max-sessions' })
    exits[0]({ exitCode: 0 })
    expect(manager.create({ cwd: root })).toEqual({ ok: false, error: 'max-sessions' })
    manager.close(first)
    expect(manager.create({ cwd: root }).ok).toBe(true)
  })
  it('trims the snapshot to the configured retained length only after the threshold', () => {
    configure({ maxBacklogChars: 2000, retainedBacklogChars: 1200 })
    const id = create()
    outputs[0]('a'.repeat(1900))
    expect(manager.subscribe(id).data.length).toBe(1900)
    outputs[0]('b'.repeat(300))
    expect(manager.subscribe(id).data).toBe('a'.repeat(900) + 'b'.repeat(300))
  })
  it('ticks at the configured status interval and forwards snapshot deadlines', async () => {
    deps.processSnapshotLimits = validateAppConfig({ processSnapshot: { unixTimeoutMs: 1900, windowsTimeoutMs: 2700 } }).processSnapshot
    configure({ statusIntervalMs: 1500 })
    create()
    await vi.advanceTimersByTimeAsync(0)
    expect(read.mock.calls[0][1]).toEqual({ unixTimeoutMs: 1900, windowsTimeoutMs: 2700 })
    vi.mocked(readScreen).mockClear()
    await vi.advanceTimersByTimeAsync(1499)
    expect(readScreen).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(readScreen).toHaveBeenCalledOnce()
  })

  it('does no command for an empty manager, shares snapshots, and stops at the last close', async () => {
    await vi.advanceTimersByTimeAsync(30_000)
    expect(read).not.toHaveBeenCalled()
    const first = create()
    await vi.advanceTimersByTimeAsync(0)
    const second = create()
    manager.setWatching(second, true)
    await vi.advanceTimersByTimeAsync(2499)
    expect(read).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(read).toHaveBeenCalledTimes(2)
    manager.close(first)
    manager.close(second)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(read).toHaveBeenCalledTimes(2)
    expect(manager.list()).toEqual([])
    expect(runTaskkill).not.toHaveBeenCalled()
  })

  it('sends only the warning flag after three failures and clears it on recovery', async () => {
    const secret = 'SYNTHETIC_PROCESS_ERROR_NOT_FOR_UI'
    read.mockRejectedValueOnce(new Error(secret))
      .mockRejectedValueOnce(new Error(secret)).mockRejectedValueOnce(new Error(secret))
    create()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(manager.list()[0].processDetectionUnavailable).toBe(false)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(manager.list()[0].processDetectionUnavailable).toBe(true)
    expect(send.mock.calls.some(([channel, sessions]) => channel === 'sessions:updated' && sessions[0]?.processDetectionUnavailable === true)).toBe(true)
    expect(JSON.stringify(send.mock.calls)).not.toContain(secret)
    expect(translate('it', 'processDetectionUnavailable')).toContain('non disponibile')
    expect(translate('en', 'processDetectionUnavailable')).toContain('unavailable')
    await vi.advanceTimersByTimeAsync(40_000)
    expect(manager.list()[0].processDetectionUnavailable).toBe(false)
  })

  it('aborts the in-flight snapshot when disposed and never applies its late result', async () => {
    let resolve!: (parents: Set<number>) => void
    read.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    create()
    const signal = read.mock.calls[0][0]!
    manager.dispose()
    send.mockClear()
    expect(signal.aborted).toBe(true)
    resolve(new Set([42]))
    await vi.advanceTimersByTimeAsync(30_000)
    expect(send).not.toHaveBeenCalled()
    expect(read).toHaveBeenCalledTimes(1)
  })
})
