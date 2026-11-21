import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureDiagnostics, diagnosticEntry, protectMainEffect, reportDiagnostic } from '../../electron/diagnostics'
import { SessionManager } from '../../electron/sessions'
import { SettingsStore } from '../../electron/settings'
import { APP_CONFIG_DEFAULTS } from './appConfig'
import { sessionErrorMessage, validSettingsWarning } from './diagnosticMessages'
import { translate } from './i18n'

vi.mock('../../electron/screen', () => ({ createScreen: () => ({ dispose: () => undefined }) }))
vi.mock('../../electron/children', () => ({ listActiveParents: async () => new Set() }))
const SECRET = 'SYNTHETIC_KEY_7129'
const PRIVATE = '/Users/synthetic-private/confidential'
const failure = () => Object.assign(new Error('spawn ' + PRIVATE + ' TOKEN=' + SECRET), {
  code: 'ENOENT', syscall: 'spawn ' + PRIVATE, path: PRIVATE, env: { TOKEN: SECRET }, stack: PRIVATE + SECRET,
})
let root: string

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'plancia-diagnostics-test-'))
  configureDiagnostics(root, 4096)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }) })
const log = () => fs.readFileSync(path.join(root, 'diagnostics.jsonl'), 'utf8')

describe('protected local diagnostics', () => {
  it('retains only timestamp, static event and allowlisted system code/operation', () => {
    const text = diagnosticEntry('pty-spawn-failed', failure())
    expect(JSON.parse(text)).toEqual({ at: expect.any(String), event: 'pty-spawn-failed', code: 'ENOENT' })
    expect(text).not.toContain(PRIVATE)
    expect(text).not.toContain(SECRET)
    expect(JSON.parse(diagnosticEntry('settings-write-failed', { code: 'EACCES', syscall: 'rename' }))).toMatchObject({ code: 'EACCES', operation: 'rename' })
  })

  it.each([() => undefined, () => SECRET, () => ({ code: SECRET, syscall: PRIVATE }), () => new Error(SECRET), () => ({ get code() { throw new Error(SECRET) } })])('handles unknown errors without exposing their data (%#)', make => {
    const error = make()
    expect(JSON.parse(diagnosticEntry('startup-failed', error)).code).toBe('UNKNOWN')
    expect(diagnosticEntry('startup-failed', error)).not.toContain(SECRET)
  })

  it('never reads message or stack getters', () => {
    const get = vi.fn(() => { throw new Error('must not inspect user text') })
    const error = Object.defineProperties({ code: 'EIO' }, { message: { get }, stack: { get } })
    expect(JSON.parse(diagnosticEntry('preload-failed', error)).code).toBe('EIO')
    expect(get).not.toHaveBeenCalled()
  })

  it('writes bounded metadata logs and rotates one private previous file', () => {
    for (let i = 0; i < 100; i++) reportDiagnostic('pty-spawn-failed', failure())
    for (const name of ['diagnostics.jsonl', 'diagnostics.jsonl.1']) {
      const file = path.join(root, name); const text = fs.readFileSync(file, 'utf8')
      expect(fs.statSync(file).size).toBeLessThanOrEqual(4096)
      expect(text).not.toContain(SECRET); expect(text).not.toContain(PRIVATE)
      for (const line of text.trim().split('\n')) expect(JSON.parse(line).code).toBe('ENOENT')
      if (process.platform !== 'win32') expect(fs.statSync(file).mode & 0o777).toBe(0o600)
    }
    expect(fs.readdirSync(root).sort()).toEqual(['diagnostics.jsonl', 'diagnostics.jsonl.1'])
  })

  it('does not read an externally enlarged managed log', () => {
    fs.writeFileSync(path.join(root, 'diagnostics.jsonl'), 'x'.repeat(6000))
    const read = vi.spyOn(fs, 'readFileSync')
    reportDiagnostic('startup-failed', failure())
    expect(read).not.toHaveBeenCalled(); read.mockRestore()
    expect(fs.statSync(path.join(root, 'diagnostics.jsonl')).size).toBeLessThan(4096)
  })

  it('falls back to safe metadata if local storage fails', () => {
    vi.spyOn(fs, 'openSync').mockImplementation(() => { throw failure() })
    expect(() => reportDiagnostic('settings-write-failed', failure())).not.toThrow()
    const messages = vi.mocked(console.error).mock.calls.flat().join(' ')
    expect(messages).toContain('settings-write-failed')
    expect(messages).not.toContain(PRIVATE); expect(messages).not.toContain(SECRET)
  })

  it.skipIf(process.platform === 'win32')('refuses symlinked current and rotated logs', () => {
    const elsewhere = path.join(root, 'elsewhere'); fs.writeFileSync(elsewhere, 'keep')
    fs.symlinkSync(elsewhere, path.join(root, 'diagnostics.jsonl'))
    reportDiagnostic('startup-failed', failure())
    expect(fs.readFileSync(elsewhere, 'utf8')).toBe('keep')
    fs.unlinkSync(path.join(root, 'diagnostics.jsonl'))
    fs.writeFileSync(path.join(root, 'diagnostics.jsonl'), 'x'.repeat(4096))
    fs.symlinkSync(elsewhere, path.join(root, 'diagnostics.jsonl.1'))
    reportDiagnostic('startup-failed', failure())
    expect(fs.readFileSync(elsewhere, 'utf8')).toBe('keep')
  })

  it('catches sync and async native failures before IPC serialization', async () => {
    const fallback = { ok: false, error: 'operation-failed' }
    expect(protectMainEffect(() => { throw failure() }, fallback)).toBe(fallback)
    expect(await protectMainEffect(async () => { throw failure() }, fallback)).toBe(fallback)
    expect(protectMainEffect(() => 7, fallback)).toBe(7)
    expect(await protectMainEffect(async () => 8, fallback)).toBe(8)
    expect(log()).not.toContain(PRIVATE); expect(log()).not.toContain(SECRET)
  })

  it('returns a fixed spawn error code from the real session manager', () => {
    const settings = new SettingsStore(root, { userData: path.join(root, 'profile'), appData: root, maxBytes: 262_144 })
    const update = vi.spyOn(settings, 'update')
    const spawn = vi.fn(() => { throw failure() })
    const manager = new SessionManager({ getWindow: () => null, settings, shells: [{ id: 'test', labelKey: 'test', command: PRIVATE, args: [] }], home: root, notify: () => undefined, maxWriteChars: 200_000, statusPatternLimits: APP_CONFIG_DEFAULTS.statusPatterns, childPollingLimits: APP_CONFIG_DEFAULTS.childPolling }, { spawn } as unknown as typeof import('node-pty'))
    try {
      expect(manager.create({ shellId: 'test', cwd: root })).toEqual({ ok: false, error: 'pty-spawn-failed' })
      expect(manager.list()).toEqual([])
      expect(spawn).toHaveBeenCalledOnce(); expect(update).not.toHaveBeenCalled()
      expect(log()).toContain('pty-spawn-failed')
      expect(log()).not.toContain(PRIVATE); expect(log()).not.toContain(SECRET)
    } finally { manager.dispose() }
  })
})

describe('renderer error contracts', () => {
  it.each(['it', 'en'] as const)('renders codes and arbitrary native errors safely in %s', locale => {
    for (const error of ['pty-spawn-failed', 'operation-failed', '', PRIVATE + SECRET]) {
      expect(sessionErrorMessage(locale, error)).toBe(translate(locale, 'createFailed'))
    }
    expect(sessionErrorMessage(locale, 'bad-cwd')).toBe(translate(locale, 'badCwd'))
    expect(sessionErrorMessage(locale, 'pty-missing')).toBe(translate(locale, 'ptyMissing'))
  })

  it('accepts only the three warning codes or null on the preload event', () => {
    for (const value of [null, 'recovered', 'read-blocked', 'write-failed']) expect(validSettingsWarning(value)).toBe(true)
    for (const value of [undefined, '', 'ENOENT', PRIVATE, { warning: SECRET }]) expect(validSettingsWarning(value)).toBe(false)
  })
})
