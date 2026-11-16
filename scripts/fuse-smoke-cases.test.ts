import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { NODE_OPTIONS_HEADER_SIZE, NODE_OPTIONS_IGNORED, nodeOptionsOutcome, processExitDetail, runAsNodeOutcome } from './fuse-smoke-cases.mjs'
import { isDiagnosticFile, launchArgs, prepareIsolatedCase } from './fuse-smoke-launch.mjs'

describe('fuse smoke case outcomes', () => {
  it('treats a live release process as blocked and an early exit as a failure', () => {
    expect(runAsNodeOutcome({ shouldRun: false, written: false, alive: true })).toBe('blocked')
    expect(runAsNodeOutcome({ shouldRun: false, written: false, alive: false })).toBeNull()
    expect(runAsNodeOutcome({ shouldRun: true, written: true, alive: false })).toBe('ran')
    expect(runAsNodeOutcome({ shouldRun: true, written: false, alive: true })).toBeNull()
    expect(runAsNodeOutcome({ shouldRun: false, written: true, alive: true })).toBeNull()
  })

  it('requires the kept NODE_OPTIONS header size on the twin and the ignore log on the release', () => {
    expect(nodeOptionsOutcome({ shouldApply: true, headerSize: NODE_OPTIONS_HEADER_SIZE, output: '' })).toBe('applied')
    expect(nodeOptionsOutcome({ shouldApply: true, headerSize: 16384, output: '' })).toBeNull()
    expect(nodeOptionsOutcome({ shouldApply: true, headerSize: NODE_OPTIONS_HEADER_SIZE, output: NODE_OPTIONS_IGNORED })).toBeNull()
    expect(nodeOptionsOutcome({ shouldApply: false, headerSize: null, output: `warn ${NODE_OPTIONS_IGNORED}` })).toBe('ignored')
    expect(nodeOptionsOutcome({ shouldApply: false, headerSize: NODE_OPTIONS_HEADER_SIZE, output: NODE_OPTIONS_IGNORED })).toBeNull()
    expect(nodeOptionsOutcome({ shouldApply: false, headerSize: null, output: 'closed' })).toBeNull()
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
