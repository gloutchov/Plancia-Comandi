import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { macPackageOptions, macUnpackedLayout } from './package-macos.mjs'

const require = createRequire(import.meta.url)
const { normalizeOptions } = require('electron-builder/out/builder.js') as {
  normalizeOptions: (options: ReturnType<typeof macPackageOptions>) => {
    publish?: string
    mac?: unknown
    arm64?: unknown
    config: {
      npmRebuild: unknown
      mac: { identity: unknown }
    }
    targets: Map<unknown, Map<number, string[]>>
  }
}
const { Arch, Platform } = require('electron-builder') as {
  Arch: { arm64: number }
  Platform: { MAC: unknown }
}

const allowedBuildKeys = [
  'publish',
  'targets',
  'mac',
  'win',
  'linux',
  'projectDir',
  'platformPackagerFactory',
  'config',
  'effectiveOptionComputed',
  'prepackaged',
]

describe('macPackageOptions', () => {
  it('requests unsigned arm64 DMG and ZIP', () => {
    const options = macPackageOptions()
    expect(options.publish).toBe('never')
    expect(options.mac).toEqual(['dmg', 'zip'])
    expect(options.arm64).toBe(true)
    expect(options.config.npmRebuild).toBe(false)
    expect(typeof options.config.npmRebuild).toBe('boolean')
    expect(options.config.mac.identity).toBeNull()
  })

  it('normalizes to the programmatic build keys electron-builder accepts', () => {
    const normalized = normalizeOptions(macPackageOptions())
    expect(Object.keys(normalized).every((key) => allowedBuildKeys.includes(key))).toBe(true)
    expect(normalized.publish).toBe('never')
    expect(normalized.mac).toBeUndefined()
    expect(normalized.arm64).toBeUndefined()
    expect(normalized.config.npmRebuild).toBe(false)
    expect(normalized.config.mac.identity).toBeNull()
    const mac = normalized.targets.get(Platform.MAC)
    expect(mac?.get(Arch.arm64)).toEqual(['dmg', 'zip'])
  })
})

describe('macUnpackedLayout', () => {
  it('points smoke and inspect at the arm64 app bundle', () => {
    const layout = macUnpackedLayout(path.posix, 'release')
    expect(layout.executable).toBe('release/mac-arm64/Plancia Comandi.app/Contents/MacOS/plancia-comandi')
    expect(layout.resources).toBe('release/mac-arm64/Plancia Comandi.app/Contents/Resources')
    expect(layout.resources.endsWith('/Contents/Resources')).toBe(true)
  })
})
