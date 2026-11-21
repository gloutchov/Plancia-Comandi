import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  APP_CONFIG_DEFAULTS,
  BRACKETED_PASTE_WRAP,
  loadAppConfig,
  resolveAppConfigFile,
  runtimeLimits,
  validateAppConfig,
} from './appConfig'

describe('validateAppConfig', () => {
  it('reads the shipped central file as the documented defaults', () => {
    const file = path.join(process.cwd(), 'config', 'app.config.json')
    expect(loadAppConfig(file)).toEqual(APP_CONFIG_DEFAULTS)
    expect(BRACKETED_PASTE_WRAP).toBe(12)
    expect(runtimeLimits(APP_CONFIG_DEFAULTS)).toEqual({
      maxPasteChars: 200_000 - BRACKETED_PASTE_WRAP,
      maxDroppedFiles: 20,
      maxPathChars: 4096,
    })
  })

  it('falls back field by field for missing, corrupt and hostile values', () => {
    expect(validateAppConfig(null)).toEqual(APP_CONFIG_DEFAULTS)
    expect(validateAppConfig('nope')).toEqual(APP_CONFIG_DEFAULTS)
    const config = validateAppConfig({
      clipboardImages: {
        directoryName: '../tmp',
        filePrefix: 'A/b',
        maxBytes: 10,
        maxEdgePx: 999_999,
        maxKeep: 0,
        maxAgeHours: -4,
      },
      terminal: { maxWriteChars: Number.POSITIVE_INFINITY },
      drop: { maxFiles: 'many', maxPathChars: 1 },
      secrets: { token: 'no' },
    })
    expect(config.clipboardImages.directoryName).toBe('clipboard-images')
    expect(config.clipboardImages.filePrefix).toBe('img')
    expect(config.clipboardImages.maxBytes).toBe(65_536)
    expect(config.clipboardImages.maxEdgePx).toBe(16_000)
    expect(config.clipboardImages.maxKeep).toBe(1)
    expect(config.clipboardImages.maxAgeHours).toBe(1)
    expect(config.terminal.maxWriteChars).toBe(200_000)
    expect(config.drop.maxFiles).toBe(20)
    expect(config.drop.maxPathChars).toBe(32)
    expect(config).not.toHaveProperty('secrets')
  })

  it('keeps an in-range custom directory and prefix', () => {
    const config = validateAppConfig({
      clipboardImages: { directoryName: 'pasted-shots', filePrefix: 'shot', maxBytes: 1_000_000 },
    })
    expect(config.clipboardImages.directoryName).toBe('pasted-shots')
    expect(config.clipboardImages.filePrefix).toBe('shot')
    expect(config.clipboardImages.maxBytes).toBe(1_000_000)
    expect(config.drop).toEqual(APP_CONFIG_DEFAULTS.drop)
  })

  it('bounds worker time, text and memory independently of corrupt values', () => {
    expect(validateAppConfig({ statusPatterns: { budgetMs: -10, startupTimeoutMs: 99_999, maxInputChars: 1, workerMemoryMb: 999 } }).statusPatterns)
      .toEqual({ budgetMs: 10, startupTimeoutMs: 10_000, maxInputChars: 256, workerMemoryMb: 128 })
    expect(validateAppConfig({ statusPatterns: { budgetMs: 'broken', startupTimeoutMs: Infinity, maxInputChars: {}, workerMemoryMb: 'broken' } }).statusPatterns)
      .toEqual(APP_CONFIG_DEFAULTS.statusPatterns)
  })

  it('prefers a resources copy and otherwise the application root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plancia-config-'))
    const resources = path.join(root, 'resources')
    fs.mkdirSync(path.join(resources, 'config'), { recursive: true })
    fs.writeFileSync(path.join(resources, 'config', 'app.config.json'), '{}')
    expect(resolveAppConfigFile(path.join(root, 'app'), resources)).toBe(path.join(resources, 'config', 'app.config.json'))
    expect(resolveAppConfigFile(path.join(root, 'app'), path.join(root, 'missing'))).toBe(
      path.join(root, 'app', 'config', 'app.config.json'),
    )
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('bounds preference input and local log limits with independent defaults', () => {
    expect(validateAppConfig({ settings: { maxBytes: 1 }, diagnostics: { maxBytes: 9_999_999 } }))
      .toMatchObject({ settings: { maxBytes: 16_384 }, diagnostics: { maxBytes: 1_048_576 } })
    expect(validateAppConfig({ settings: { maxBytes: Infinity }, diagnostics: { maxBytes: 'broken' } }))
      .toMatchObject({ settings: APP_CONFIG_DEFAULTS.settings, diagnostics: APP_CONFIG_DEFAULTS.diagnostics })
    expect(validateAppConfig({ settings: { maxBytes: 20_000.8 } }).settings.maxBytes).toBe(20_001)
    for (const value of [null, true, '20000', [], { toString: 'invalid' }]) {
      expect(validateAppConfig({ settings: { maxBytes: value }, diagnostics: { maxBytes: value } }))
        .toMatchObject({ settings: APP_CONFIG_DEFAULTS.settings, diagnostics: APP_CONFIG_DEFAULTS.diagnostics })
    }
  })

  it('uses defaults when the file cannot be read', () => {
    expect(loadAppConfig(path.join(os.tmpdir(), 'plancia-missing-app.config.json'))).toEqual(APP_CONFIG_DEFAULTS)
  })

  it('validates child polling deadlines, backoff and warning threshold independently', () => {
    expect(validateAppConfig({ childPolling: {
      intervalMs: 1, initialBackoffMs: 1, maxBackoffMs: 999_999, unavailableAfter: 99,
    } }).childPolling).toEqual({ intervalMs: 1000, initialBackoffMs: 10_000, maxBackoffMs: 60_000, unavailableAfter: 10 })
    expect(validateAppConfig({ childPolling: {
      intervalMs: 999_999, initialBackoffMs: 999_999, maxBackoffMs: 1, unavailableAfter: 0,
    } }).childPolling).toEqual({ intervalMs: 60_000, initialBackoffMs: 60_000, maxBackoffMs: 60_000, unavailableAfter: 1 })
    for (const value of [null, true, '2500', [], {}, Infinity, NaN]) {
      expect(validateAppConfig({ childPolling: {
        intervalMs: value, initialBackoffMs: value, maxBackoffMs: value, unavailableAfter: value,
      } }).childPolling).toEqual(APP_CONFIG_DEFAULTS.childPolling)
    }
    expect(validateAppConfig({ childPolling: {
      intervalMs: 3000.6, initialBackoffMs: 15_000, maxBackoffMs: 30_000, unavailableAfter: 4,
    } }).childPolling).toEqual({ intervalMs: 3001, initialBackoffMs: 15_000, maxBackoffMs: 30_000, unavailableAfter: 4 })
  })
})
