import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasDevelopmentSmoke, developmentSmokeEnvironment, assertNoDevelopmentFiles } from './smoke-development-flags.mjs'

describe('packaged development-control smoke', () => {
  it('starts at 0.3.9 and tests all ten variables in isolated directories', () => {
    for (const version of ['0.3.8', '0.2.9', 'invalid']) expect(hasDevelopmentSmoke(version)).toBe(false)
    for (const version of ['0.3.9', '0.3.10', '0.4.0', '1.0.0']) expect(hasDevelopmentSmoke(version)).toBe(true)
    const root = path.resolve('/synthetic')
    const env = developmentSmokeEnvironment(root)
    expect(Object.keys(env)).toHaveLength(10)
    for (const [key, value] of Object.entries(env)) {
      if (key.endsWith('_DIR')) expect(path.dirname(value)).toBe(root)
      else expect(value).toBe('1')
    }
  })

  it('rejects screenshot or startup-trace directories even before a file is written', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'plancia-dev-flags-'))
    try {
      expect(() => assertNoDevelopmentFiles(root)).not.toThrow()
      mkdirSync(path.join(root, 'forbidden-trace'))
      expect(() => assertNoDevelopmentFiles(root)).toThrow('forbidden-trace')
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})
