import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStartupTrace, installStartupProcessHandlers, scrubDiagnosticText, startupFailureDetail, startupLine, startupProcessDetail } from './startupTrace'

describe('startup trace', () => {
  it('keeps allowlisted facts and drops free text', () => {
    const line = JSON.parse(startupLine('app.quit', {
      reason: 'single-instance-lock',
      ready: false,
      note: 'user secret',
      userData: 'C:/temp/user-data',
    }))
    expect(line.event).toBe('app.quit')
    expect(line.reason).toBe('single-instance-lock')
    expect(line.ready).toBe(false)
    expect(line.userData).toBe('C:/temp/user-data')
    expect(line.note).toBeUndefined()
  })

  it('keeps a bounded startup failure and drops other free text', () => {
    const line = JSON.parse(startupLine('startup-failed', {
      step: 'paths',
      name: 'Error',
      message: 'Failed to get \'appData\' path',
      stack: 'Error: Failed\n    at start',
      cause: 'TypeError: bad',
      note: 'secret token',
    }))
    expect(line.step).toBe('paths')
    expect(line.name).toBe('Error')
    expect(line.message).toBe('Failed to get \'appData\' path')
    expect(line.stack).toContain('at start')
    expect(line.cause).toBe('TypeError: bad')
    expect(line.note).toBeUndefined()
    const long = JSON.parse(startupLine('startup-failed', { message: 'm'.repeat(800), stack: 's'.repeat(3000) }))
    expect(long.message).toHaveLength(500)
    expect(long.stack).toHaveLength(2000)
  })

  it('records a missing cause and an unknown code in the startup file line', () => {
    const error = new Error("Failed to get 'appData' path")
    const detail = startupFailureDetail('paths', error)
    expect(detail.cause).toBeNull()
    expect(detail.code).toBe('UNKNOWN')
    const line = JSON.parse(startupLine('startup-failed', detail))
    expect(line.step).toBe('paths')
    expect(line.cause).toBeNull()
    expect(line.code).toBe('UNKNOWN')
    expect(line.message).toBe("Failed to get 'appData' path")
    const wrapped = new Error('outer')
    wrapped.cause = new Error('inner')
    expect(startupFailureDetail('settings', wrapped).cause).toBe('Error: inner')
  })

  it('registers the process handlers only when the startup trace is enabled', () => {
    const off = new EventEmitter()
    installStartupProcessHandlers({}, null, off)
    installStartupProcessHandlers({ PLANCIA_DIAG_STARTUP: '0' }, createStartupTrace(undefined, () => {}), off)
    expect(off.listenerCount('uncaughtException')).toBe(0)
    expect(off.listenerCount('unhandledRejection')).toBe(0)

    const on = new EventEmitter()
    const lines: string[] = []
    const trace = createStartupTrace(undefined, (line) => lines.push(line))
    installStartupProcessHandlers({ PLANCIA_DIAG_STARTUP: '1' }, trace, on)
    expect(on.listenerCount('uncaughtException')).toBe(1)
    expect(on.listenerCount('unhandledRejection')).toBe(1)
    on.emit('uncaughtException', new Error('boom'))
    on.emit('unhandledRejection', 'plain')
    expect(lines.map((line) => JSON.parse(line).event)).toEqual(['uncaughtException', 'unhandledRejection'])
    expect(JSON.parse(lines[0]).name).toBe('Error')
    expect(JSON.parse(lines[1]).name).toBe('non-error')
  })

  it('scrubs absolute paths from process-handler diagnostics on Windows and POSIX', () => {
    const windows = startupProcessDetail(Object.assign(new Error('spawn C:\\Users\\runneradmin\\AppData\\Local\\plancia.exe from D:\\a\\_temp\\agent.js ENOENT'), {
      code: 'ENOENT',
      syscall: 'spawn',
      stack: [
        'Error: spawn C:\\Users\\runneradmin\\AppData\\Local\\plancia.exe ENOENT',
        '    at WindowsPtyAgent.kill (C:\\Users\\runneradmin\\app\\windowsPtyAgent.js:147:10)',
        '    at SessionManager.close (D:\\a\\_temp\\sessions.js:285:7)',
      ].join('\n'),
    }), ['C:\\Users\\runneradmin'])
    const windowsLine = startupLine('unhandledRejection', windows)
    expect(windowsLine).not.toMatch(/[A-Za-z]:[\\/]/)
    expect(windowsLine).not.toContain('runneradmin')
    expect(windowsLine).toContain('<path>')
    expect(windowsLine).toContain('ENOENT')
    expect(windowsLine).toContain('spawn')
    expect(windowsLine).toContain('WindowsPtyAgent.kill windowsPtyAgent.js:147')
    expect(windowsLine).toContain('SessionManager.close sessions.js:285')
    expect(typeof windows.message).toBe('string')
    expect(String(windows.message).length).toBeLessThanOrEqual(200)

    const posix = startupProcessDetail(Object.assign(new Error('open /home/ubuntu/src/app.js and /tmp/plancia/secret'), {
      stack: '    at close (/home/ubuntu/app/sessions.js:10:4)',
    }), ['/home/ubuntu'])
    const posixLine = startupLine('uncaughtException', posix)
    expect(posixLine).not.toContain('/home/ubuntu')
    expect(posixLine).not.toContain('/tmp/plancia')
    expect(posixLine).toContain('<home>')
    expect(posixLine).toContain('<path>')
    expect(posixLine).toContain('close sessions.js:10')
    expect(scrubDiagnosticText('ab '.repeat(100), [])).toHaveLength(200)

    const main = readFileSync(new URL('../../electron/main.ts', import.meta.url), 'utf8')
    const branch = main.slice(main.indexOf('if (startupTrace) {'), main.indexOf('function quitFor'))
    expect(branch).toContain('installStartupProcessHandlers(process.env, startupTrace, process)')
    expect(main.replace(branch, '')).not.toContain('installStartupProcessHandlers(')
    expect(main).not.toContain("process.on('uncaughtException'")
    expect(main).not.toContain("process.on('unhandledRejection'")
  })

  it('replaces every backslash token with a path placeholder', () => {
    const text = scrubDiagnosticText('load C:\\Program Files\\X\\y.dll and resources\\app.asar\\main.js', [])
    expect(text).not.toContain('\\')
    expect(text).not.toContain('y.dll')
    expect(text).not.toContain('app.asar')
    expect(text).toContain('<path>')
  })

  it('replaces wide POSIX paths and tilde paths', () => {
    const text = scrubDiagnosticText('open /tmp/plancia/città,file%20.txt and ~/secret,name', [])
    expect(text).not.toContain('/tmp')
    expect(text).not.toContain('città')
    expect(text).not.toContain('~/secret')
    expect(text).toContain('<path>')
  })

  it('replaces URLs before other tokens', () => {
    const text = scrubDiagnosticText('see https://example.com/a/b?q=1 and FILE://HOST/share', [])
    expect(text).not.toContain('example.com')
    expect(text).not.toContain('HOST')
    expect(text).toContain('<url>')
  })

  it('redacts environment assignments, auth schemes and long tokens', () => {
    const text = scrubDiagnosticText(`PATH=C:\\Windows\\System32 Bearer abc.def Basic xyz ${'A'.repeat(32)}`, [])
    expect(text).not.toContain('Windows')
    expect(text).not.toContain('abc.def')
    expect(text).not.toContain('xyz')
    expect(text).not.toContain('A'.repeat(32))
    expect(text).toContain('<env>')
    expect(text).toContain('<redacted>')
  })

  it('keeps only safe name, code and syscall tokens', () => {
    const rejected = startupProcessDetail(Object.assign(new Error('plain'), {
      name: 'C:\\secret', code: 'not-a-code', syscall: 'Spawn',
    }), [])
    expect(rejected.name).toBe('Error')
    expect(rejected.code).toBeUndefined()
    expect(rejected.syscall).toBeUndefined()
    const kept = startupProcessDetail(Object.assign(new Error('plain'), {
      name: 'TypeError', code: 'ENOENT', syscall: 'spawn',
    }), [])
    expect(kept.name).toBe('TypeError')
    expect(kept.code).toBe('ENOENT')
    expect(kept.syscall).toBe('spawn')
  })

  it('bounds a huge spaceless message before the patterns run', () => {
    const started = Date.now()
    const text = scrubDiagnosticText('a'.repeat(100_000), [])
    expect(Date.now() - started).toBeLessThan(2000)
    expect(text.length).toBeLessThanOrEqual(200)
    const detail = startupProcessDetail(Object.assign(new Error('kept'), {
      stack: `    at ${'b'.repeat(1001)} (sessions.js:1:1)\n    at close (sessions.js:2:1)`,
    }), [])
    expect(String(detail.stack)).toBe('close sessions.js:2')
    expect(String(detail.stack)).not.toContain('b'.repeat(40))
  })

  it('redacts assignment-like secret names before path cleanup', () => {
    const text = scrubDiagnosticText('token=abc --password=x apiKey: abc', [])
    expect(text).not.toContain('token=abc')
    expect(text).not.toContain('password=x')
    expect(text).not.toContain('apiKey: abc')
    expect(text).toContain('<redacted>')
  })

  it('scrubs function names in frames and limits them to 80 characters', () => {
    const long = 'fn.'.repeat(30)
    const detail = startupProcessDetail(Object.assign(new Error('x'), {
      stack: [
        `    at ${long} (sessions.js:3:1)`,
        '    at C:\\secret\\mod.kill (windowsPtyAgent.js:4:1)',
      ].join('\n'),
    }), [])
    const frames = String(detail.stack).split(' | ')
    expect(frames[0]).toBe(`${long.slice(0, 80)} sessions.js:3`)
    expect(frames[1]).toBe('<path> windowsPtyAgent.js:4')
    expect(frames[1]).not.toContain('secret')
  })

  it('writes the same line to stderr and to the case directory', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'plancia-trace-'))
    const seen: string[] = []
    const trace = createStartupTrace(dir, (line) => seen.push(line))
    trace.setQuitReason('window-all-closed')
    trace.event('app.quit', { reason: trace.reason(), ready: true })
    const file = readFileSync(path.join(dir, 'startup.jsonl'), 'utf8').trim()
    expect(seen).toEqual([file])
    expect(JSON.parse(file).reason).toBe('window-all-closed')
  })
})
