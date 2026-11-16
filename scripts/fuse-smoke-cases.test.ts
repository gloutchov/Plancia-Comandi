import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { HEADER_SIZE_READ, NODE_OPTIONS_HEADER_SIZE, NODE_OPTIONS_IGNORED, formatNodeOptionsMiss, headerSizeFromEvaluation, nodeOptionsOutcome, processExitDetail, reportNodeOptionsMiss, runAsNodeOutcome, startupDiagnostic } from './fuse-smoke-cases.mjs'
import { isDiagnosticFile, launchArgs, prepareIsolatedCase, startupCrashEvents } from './fuse-smoke-launch.mjs'

describe('fuse smoke case outcomes', () => {
  it('treats a live release process as blocked and an early exit as a failure', () => {
    expect(runAsNodeOutcome({ shouldRun: false, written: false, alive: true })).toBe('blocked')
    expect(runAsNodeOutcome({ shouldRun: false, written: false, alive: false })).toBeNull()
    expect(runAsNodeOutcome({ shouldRun: true, written: true, alive: false })).toBe('ran')
    expect(runAsNodeOutcome({ shouldRun: true, written: false, alive: true })).toBeNull()
    expect(runAsNodeOutcome({ shouldRun: false, written: true, alive: true })).toBeNull()
  })

  it('requires the kept NODE_OPTIONS header size on the twin and the ignore log on the release', () => {
    expect(nodeOptionsOutcome({ shouldApply: true, headerSize: NODE_OPTIONS_HEADER_SIZE, output: '' })).toBe(`applied:${NODE_OPTIONS_HEADER_SIZE}`)
    expect(nodeOptionsOutcome({ shouldApply: true, headerSize: 16384, output: '' })).toBeNull()
    expect(nodeOptionsOutcome({ shouldApply: true, headerSize: NODE_OPTIONS_HEADER_SIZE, output: NODE_OPTIONS_IGNORED })).toBeNull()
    expect(nodeOptionsOutcome({ shouldApply: false, headerSize: null, output: `warn ${NODE_OPTIONS_IGNORED}` })).toBe('ignored')
    expect(nodeOptionsOutcome({ shouldApply: false, headerSize: NODE_OPTIONS_HEADER_SIZE, output: NODE_OPTIONS_IGNORED })).toBeNull()
    expect(nodeOptionsOutcome({ shouldApply: false, headerSize: null, output: 'closed' })).toBeNull()
    expect(nodeOptionsOutcome({ shouldApply: false, headerSize: null, output: NODE_OPTIONS_IGNORED, alive: false })).toBeNull()
  })

  it('reads the header size without a global require and keeps the full exception text', () => {
    const builtin = HEADER_SIZE_READ.indexOf('getBuiltinModule')
    const mainModule = HEADER_SIZE_READ.indexOf('mainModule')
    const requireCall = HEADER_SIZE_READ.indexOf("require('node:http')")
    expect(builtin).toBeGreaterThan(-1)
    expect(builtin).toBeLessThan(mainModule)
    expect(mainModule).toBeLessThan(requireCall)
    const description = 'ReferenceError: require is not defined\n    at <anonymous>:1:1'
    const failed = headerSizeFromEvaluation({
      exceptionDetails: { exception: { className: 'ReferenceError', description } },
    })
    expect(failed.headerSize).toBeNull()
    expect(failed.description).toBe(description)
    expect(failed.error).toBe(description)
    expect(headerSizeFromEvaluation({ result: { value: { size: 8192, via: 'getBuiltinModule' } } })).toEqual({
      headerSize: 8192, error: null, description: null,
    })
  })

  it('treats an uncaught startup event as a package-smoke failure', () => {
    expect(startupCrashEvents([{ event: 'paths' }, { event: 'files' }])).toEqual([])
    expect(startupCrashEvents([{ event: 'uncaughtException' }, { event: 'unhandledRejection' }])).toEqual(['uncaughtException', 'unhandledRejection'])
  })

  it('prints the startup failure line only when the process is dead', () => {
    expect(startupDiagnostic(true, 'Release startup failed', [{ event: 'paths' }])).toBeNull()
    expect(startupDiagnostic(false, 'Release startup failed', [{ event: 'startup-failed' }])).toEqual({
      case: 'Release startup failed',
      alive: false,
      startup: [{ event: 'startup-failed' }],
    })
  })

  it('prints the observed header size, error, port and exit when NODE_OPTIONS misses', () => {
    const message = formatNodeOptionsMiss({
      shouldApply: true,
      headerSize: null,
      readError: 'Runtime evaluation failed',
      port: 49284,
      exitCode: 0,
      signal: null,
      elapsedMs: 1001,
      timeoutMs: 8000,
    })
    expect(message).toContain('header size missing')
    expect(message).toContain('Runtime evaluation failed')
    expect(message).toContain('127.0.0.1:49284')
    expect(message).toContain(String(NODE_OPTIONS_HEADER_SIZE))
    expect(message).toContain('exit 0')
    expect(message).toContain('1001')
    expect(message).toContain('8000')
    const seen = []
    const write = console.log
    console.log = (line) => { seen.push(String(line)) }
    let reported
    try {
      reported = reportNodeOptionsMiss({
        shouldApply: true,
        headerSize: null,
        readError: 'socket refused',
        port: 49284,
        exitCode: 0,
        signal: null,
        elapsedMs: 1001,
        timeoutMs: 8000,
      })
    } finally {
      console.log = write
    }
    expect(JSON.parse(seen[0])).toEqual({
      case: 'NODE_OPTIONS', headerSize: null, readError: 'socket refused', port: 49284, exitCode: 0, signal: null, elapsedMs: 1001,
    })
    expect(reported).toBe(formatNodeOptionsMiss({
      shouldApply: true, headerSize: null, readError: 'socket refused', port: 49284, exitCode: 0, signal: null, elapsedMs: 1001, timeoutMs: 8000,
    }))
    const check = spawnSync(process.execPath, ['--check', fileURLToPath(new URL('./smoke-fuses.mjs', import.meta.url))], { encoding: 'utf8' })
    expect(check.status, check.stderr).toBe(0)
  })

  it('keeps the exit code, signal and output of a process that quit', () => {
    expect(processExitDetail({ pid: 12, code: 0, signal: null, error: null, output: 'hello' })).toEqual({
      pid: 12, exitCode: 0, signal: null, spawnError: null, outputTail: 'hello',
    })
    expect(processExitDetail({ pid: 4, code: null, signal: null, error: 'spawn ENOENT', output: '' }).spawnError).toBe('spawn ENOENT')
  })

  it('uses the package-smoke profile and adds only the startup trace', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'plancia-fuse-profile-'))
    try {
      const profile = await prepareIsolatedCase(dir, { startupTrace: true })
      expect(profile.env.PLANCIA_DIAG_STARTUP).toBe('1')
      expect(profile.env.PLANCIA_DIAG_DIR).toBe(dir)
      expect(profile.env.ELECTRON_NO_ATTACH_CONSOLE).toBeUndefined()
      expect(profile.env.ELECTRON_ENABLE_LOGGING).toBeUndefined()
      expect(profile.env.HOME).toBe(path.join(dir, 'home'))
      expect(profile.env.APPDATA).toBe(path.join(dir, 'app-data'))
      expect(profile.env.LOCALAPPDATA).toBe(path.join(dir, 'local-app-data'))
      expect(existsSync(path.join(dir, 'session-data'))).toBe(true)
      expect(JSON.parse(readFileSync(path.join(profile.userData, 'settings.json'), 'utf8')).lastCwd).toBe(dir)
      expect(launchArgs(profile, [`--user-data-dir=${profile.userData}`])).toEqual([`--user-data-dir=${profile.userData}`])
      for (const name of ['home', 'app-data', 'local-app-data', 'user-data', 'session-data', 'shell', 'config', 'data', 'cache']) {
        expect(existsSync(path.join(dir, name))).toBe(true)
      }
      if (process.platform === 'win32') {
        expect(existsSync(path.join(profile.env.USERPROFILE, 'AppData', 'Roaming'))).toBe(true)
        expect(existsSync(path.join(profile.env.USERPROFILE, 'AppData', 'Local'))).toBe(true)
        expect(profile.env.HOMEDRIVE).toMatch(/^[A-Za-z]:$/)
        expect(profile.env.HOMEPATH.startsWith('\\')).toBe(true)
        expect(profile.env.SystemRoot || profile.env.SYSTEMROOT).toBeTruthy()
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('keeps Electron logs and crash dumps and skips settings', () => {
    expect(isDiagnosticFile('debug.log')).toBe(true)
    expect(isDiagnosticFile('crashpad.dmp')).toBe(true)
    expect(isDiagnosticFile('startup.jsonl')).toBe(true)
    expect(isDiagnosticFile('settings.json')).toBe(false)
  })
})
