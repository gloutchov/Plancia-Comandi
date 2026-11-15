import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsStore } from '../../electron/settings'
import { readSettingsFile } from '../../electron/settingsFile'
import { configureDiagnostics } from '../../electron/diagnostics'
import type { AppSettings } from './types'

let root: string
let options: { userData: string; appData: string; maxBytes: number }
const file = () => path.join(options.userData, 'settings.json')
function put(value: string, target = file()): void {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, value)
}
function store(): SettingsStore { return new SettingsStore(root, options) }
function backups(): string[] { return fs.readdirSync(options.userData).filter(n => n.endsWith('.bak')) }
function denied(): Error { return Object.assign(new Error('/Users/private TOKEN=secret'), { code: 'EACCES' }) }

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'plancia-settings-test-'))
  options = { userData: path.join(root, 'profile'), appData: path.join(root, 'app-data'), maxBytes: 262_144 }
  configureDiagnostics(path.join(root, 'logs'), 4096)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }) })

describe('bounded preference storage', () => {
  it('starts with defaults without creating a missing settings file', () => {
    const s = store()
    expect(s.data).toMatchObject({ locale: 'it', theme: 'system', lastCwd: root })
    expect(s.warning).toBeNull()
    expect(fs.existsSync(file())).toBe(false)
  })

  it('persists and reloads language, theme, status and last directory atomically', () => {
    const s = store()
    s.update({ locale: 'en', theme: 'dark', status: { quietTimeoutMs: 9876 }, lastCwd: root })
    expect(store().data).toEqual(s.data)
    expect(fs.readdirSync(options.userData)).toEqual(['settings.json'])
    if (process.platform !== 'win32') expect(fs.statSync(file()).mode & 0o777).toBe(0o600)
  })

  it.each(['{broken', '', 'null', '[]', '17', '"text"'])('preserves invalid JSON/schema %j before defaults', raw => {
    put(raw)
    const s = store()
    expect(s.data.locale).toBe('it')
    expect(s.warning).toBe('recovered')
    expect(fs.readFileSync(file() + '.bak', 'utf8')).toBe(raw)
    expect(fs.existsSync(file())).toBe(false)
    s.update({ locale: 'en' })
    expect(s.warning).toBeNull()
    expect(store().data.locale).toBe('en')
    expect(fs.readFileSync(file() + '.bak', 'utf8')).toBe(raw)
  })

  it('keeps older backups and reserves a distinct .bak on a second corruption', () => {
    put('first', file() + '.bak'); put('second')
    expect(store().warning).toBe('recovered')
    expect(backups()).toHaveLength(2)
    expect(backups().map(n => fs.readFileSync(path.join(options.userData, n), 'utf8')).sort()).toEqual(['first', 'second'])
  })

  it('preserves invalid UTF-8 byte for byte instead of silently replacing characters', () => {
    const bytes = Buffer.concat([Buffer.from('{"lastShellId":"'), Buffer.from([0xff]), Buffer.from('"}')])
    fs.mkdirSync(options.userData, { recursive: true }); fs.writeFileSync(file(), bytes)
    expect(store().warning).toBe('recovered')
    expect(fs.readFileSync(file() + '.bak')).toEqual(bytes)
  })

  it('checks byte boundaries before JSON parsing, including multibyte text', () => {
    const body = JSON.stringify({ lastShellId: 'é' })
    put(body)
    expect(readSettingsFile(file(), Buffer.byteLength(body)).kind).toBe('valid')
    expect(readSettingsFile(file(), Buffer.byteLength(body) - 1).kind).toBe('oversized')
  })

  it('quarantines oversized settings without reading their bytes', () => {
    put('x'.repeat(options.maxBytes + 1))
    const read = vi.spyOn(fs, 'readSync')
    expect(store().warning).toBe('recovered')
    expect(read).not.toHaveBeenCalled()
    expect(fs.statSync(file() + '.bak').size).toBe(options.maxBytes + 1)
  })

  it('bounds a file that grows after the initial stat', () => {
    put('x'.repeat(80))
    const real = fs.fstatSync
    vi.spyOn(fs, 'fstatSync').mockImplementation((...args) => Object.assign(real(...args), { size: 0 }))
    expect(readSettingsFile(file(), 32).kind).toBe('oversized')
  })

  it('sanitizes corrupt field values without coercion crashes or unknown status fields', () => {
    put(JSON.stringify({ locale: 'xx', theme: [], fontSize: { toString: 'secret' }, lastCwd: '/not-a-real-directory', status: { quietTimeoutMs: { toString: 'secret' }, apiKey: 'SYNTHETIC_PRIVATE' } }))
    const s = store()
    expect(s.data).toMatchObject({ locale: 'it', theme: 'system', fontSize: 14, lastCwd: root })
    expect(s.data.status).not.toHaveProperty('apiKey')
    expect(() => s.save()).not.toThrow()
    expect(fs.readFileSync(file(), 'utf8')).not.toContain('SYNTHETIC_PRIVATE')
  })

  it.each(['write', 'flush', 'replace'] as const)('preserves the last valid file on %s failure', operation => {
    const s = store(); s.update({ locale: 'en', theme: 'dark' }); const before = fs.readFileSync(file())
    const method = operation === 'write' ? 'writeFileSync' : operation === 'flush' ? 'fsyncSync' : 'renameSync'
    const spy = vi.spyOn(fs, method).mockImplementation(() => { throw denied() })
    expect(() => s.update({ locale: 'it', theme: 'light' })).not.toThrow()
    expect(s.warning).toBe('write-failed')
    expect(s.data.locale).toBe('it') // The UI can still operate for this session.
    expect(fs.readFileSync(file())).toEqual(before)
    expect(fs.readdirSync(options.userData)).toEqual(['settings.json'])
    spy.mockRestore()
    s.update({ locale: 'it' })
    expect(s.warning).toBeNull()
    expect(store().data.locale).toBe('it')
  })

  it('leaves the original untouched and blocks saves if backup replacement is denied', () => {
    put('corrupt')
    const spy = vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw denied() })
    const s = store(); expect(s.warning).toBe('read-blocked'); spy.mockRestore()
    s.update({ locale: 'en' })
    expect(s.data.locale).toBe('en')
    expect(s.warning).toBe('read-blocked')
    expect(fs.readFileSync(file(), 'utf8')).toBe('corrupt')
    expect(backups()).toEqual([])
  })

  it('does not overwrite an unreadable file even if permissions recover mid-session', () => {
    put('{"locale":"en"}')
    const real = fs.openSync
    const spy = vi.spyOn(fs, 'openSync').mockImplementation((...args) => {
      if (args[0] === file()) throw denied()
      return real(...args)
    })
    const s = store(); expect(s.warning).toBe('read-blocked'); spy.mockRestore()
    s.update({ theme: 'dark' })
    expect(fs.readFileSync(file(), 'utf8')).toBe('{"locale":"en"}')
    expect(store().data.locale).toBe('en')
  })

  it.skipIf(process.platform === 'win32')('handles real directory permissions without losing a readable configuration', () => {
    put('{"locale":"en"}')
    const s = store(); fs.chmodSync(options.userData, 0o500)
    try {
      s.update({ locale: 'it' })
      expect(s.warning).toBe('write-failed')
      expect(fs.readFileSync(file(), 'utf8')).toBe('{"locale":"en"}')
    } finally { fs.chmodSync(options.userData, 0o700) }
  })

  it('refuses a directory at the target without altering its children', () => {
    fs.mkdirSync(file(), { recursive: true }); put('keep', path.join(file(), 'private'))
    const s = store(); s.update({ locale: 'en' })
    expect(s.warning).toBe('read-blocked')
    expect(fs.readFileSync(path.join(file(), 'private'), 'utf8')).toBe('keep')
  })

  it.skipIf(process.platform === 'win32')('refuses leaf symlinks without reading or writing their destination', () => {
    const target = path.join(root, 'elsewhere'); put('{"locale":"en"}', target)
    fs.mkdirSync(options.userData, { recursive: true }); fs.symlinkSync(target, file())
    const s = store(); s.update({ locale: 'it' })
    expect(s.warning).toBe('read-blocked')
    expect(fs.readFileSync(target, 'utf8')).toBe('{"locale":"en"}')
  })

  it.each(['Molo', 'molo'])('migrates sanitized %s preferences and preserves the legacy file', name => {
    const legacy = path.join(options.appData, name, 'settings.json')
    const raw = JSON.stringify({ locale: 'en', theme: 'dark', secret: 'SYNTHETIC_PRIVATE', status: { extraIdlePatterns: ['ready'] } }); put(raw, legacy)
    const s = store()
    expect(s.data).toMatchObject({ locale: 'en', theme: 'dark' })
    expect(s.data.status.extraIdlePatterns).toEqual(['ready'])
    expect(fs.readFileSync(legacy, 'utf8')).toBe(raw)
    expect(fs.readFileSync(file(), 'utf8')).not.toContain('SYNTHETIC_PRIVATE')
  })

  it('prefers current settings over legacy settings', () => {
    put('{"locale":"it"}'); put('{"locale":"en"}', path.join(options.appData, 'Molo', 'settings.json'))
    expect(store().data.locale).toBe('it')
  })

  it('backs up corrupt legacy bytes in the new profile without editing the old file', () => {
    const legacy = path.join(options.appData, 'Molo', 'settings.json'); put('bad legacy', legacy)
    expect(store().warning).toBe('recovered')
    expect(fs.readFileSync(file() + '.bak', 'utf8')).toBe('bad legacy')
    expect(fs.readFileSync(legacy, 'utf8')).toBe('bad legacy')
  })

  it('does not copy an oversized legacy file; preserves it and blocks automatic replacement', () => {
    const legacy = path.join(options.appData, 'Molo', 'settings.json'); put('x'.repeat(options.maxBytes + 1), legacy)
    const s = store(); s.update({ locale: 'en' })
    expect(s.warning).toBe('read-blocked')
    expect(fs.existsSync(file())).toBe(false)
    expect(fs.statSync(legacy).size).toBe(options.maxBytes + 1)
  })

  it('handles a failed legacy migration without startup failure or modifying the original', () => {
    const legacy = path.join(options.appData, 'Molo', 'settings.json'); put('{"locale":"en"}', legacy)
    vi.spyOn(fs, 'renameSync').mockImplementation(() => { throw denied() })
    const s = store()
    expect(s.data.locale).toBe('en')
    expect(s.warning).toBe('write-failed')
    expect(fs.readFileSync(legacy, 'utf8')).toBe('{"locale":"en"}')
    expect(fs.existsSync(file())).toBe(false)
  })

  it('refuses an over-limit serialized update and preserves the previous valid file', () => {
    const s = store(); s.save(); const before = fs.readFileSync(file()); options.maxBytes = 32
    s.save()
    expect(s.warning).toBe('write-failed')
    expect(fs.readFileSync(file())).toEqual(before)
  })

  it.each(['writeFileSync', 'renameSync'])('survives actual worker interruption during %s', async stage => {
    put('{"locale":"en","theme":"dark"}')
    const source = path.resolve('electron/privateFile.ts')
    const code = ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const worker = new Worker(`
      const { parentPort, workerData } = require('node:worker_threads');
      const fs = require('node:fs'); const Module = require('node:module');
      const m = new Module(workerData.source); m.filename = workerData.source; m._compile(workerData.code, workerData.source);
      const original = fs[workerData.stage];
      fs[workerData.stage] = (...args) => {
        if (workerData.stage === 'writeFileSync') fs.writeSync(args[0], '{partial');
        parentPort.postMessage('paused'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
        return original(...args);
      };
      m.exports.atomicPrivateWrite(workerData.file, '{"locale":"it"}');
    `, { eval: true, workerData: { source, code, file: file(), stage } })
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Interruption fixture did not reach the checkpoint')), 3000)
        worker.once('message', () => { clearTimeout(timer); resolve() })
        worker.once('error', error => { clearTimeout(timer); reject(error) })
      })
    } finally { await worker.terminate() }
    expect(store().data).toMatchObject({ locale: 'en', theme: 'dark' } satisfies Partial<AppSettings>)
    const s = store(); s.update({ locale: 'it' }); expect(store().data.locale).toBe('it')
  }, 5000)
})
