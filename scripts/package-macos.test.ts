import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import {
  MAC_APP_NAME,
  assertConfiguredMacAppName,
  discoverMacApp,
  macPackageOptions,
  requireSingleAppBundle,
} from './package-macos.mjs'

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

describe('requireSingleAppBundle', () => {
  it('fails when no bundle or more than one bundle is present', () => {
    expect(() => requireSingleAppBundle([])).toThrow(/found 0/)
    expect(() => requireSingleAppBundle(['notes.txt'])).toThrow(/found 0/)
    expect(() => requireSingleAppBundle(['one.app', 'two.app'])).toThrow(/found 2/)
  })

  it('accepts the single bundle, whatever its name is', () => {
    expect(requireSingleAppBundle(['notes.txt', 'one.app'])).toBe('one.app')
  })
})

describe('MAC_APP_NAME', () => {
  it('matches executableName in electron-builder.json5', () => {
    const requireJson5 = createRequire(import.meta.url)
    const JSON5 = requireJson5('json5') as { parse: (text: string) => { executableName: string } }
    const config = JSON5.parse(readFileSync(new URL('../electron-builder.json5', import.meta.url), 'utf8'))
    expect(MAC_APP_NAME).toBe(`${config.executableName}.app`)
    expect(() => assertConfiguredMacAppName('Other.app')).toThrow(/expected plancia-comandi.app/)
    expect(assertConfiguredMacAppName(MAC_APP_NAME)).toBe(MAC_APP_NAME)
  })
})

describe('discoverMacApp', () => {
  it('reads CFBundleExecutable from the one unpacked bundle', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'plancia-mac-app-'))
    const contents = path.join(root, MAC_APP_NAME, 'Contents')
    mkdirSync(path.join(contents, 'MacOS'), { recursive: true })
    writeFileSync(
      path.join(contents, 'Info.plist'),
      '<plist><dict><key>CFBundleExecutable</key><string>plancia-comandi</string></dict></plist>',
    )
    try {
      const layout = discoverMacApp(root)
      expect(layout.executable).toBe(path.join(root, MAC_APP_NAME, 'Contents', 'MacOS', 'plancia-comandi'))
      expect(layout.resources).toBe(path.join(root, MAC_APP_NAME, 'Contents', 'Resources'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
