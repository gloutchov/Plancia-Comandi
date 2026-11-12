import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { windowsPackageOptions } from './package-windows.mjs'

const require = createRequire(import.meta.url)
const { normalizeOptions } = require('electron-builder/out/builder.js') as {
  normalizeOptions: (options: ReturnType<typeof windowsPackageOptions>) => {
    publish?: string
    win?: unknown
    x64?: unknown
    config: {
      npmRebuild: unknown
      nsis: { runAfterFinish: unknown; artifactName: string }
      portable: { artifactName: string }
    }
    targets: Map<unknown, Map<number, string[]>>
  }
}
const { Arch } = require('electron-builder') as { Arch: { x64: number } }

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

describe('windowsPackageOptions', () => {
  it('passes boolean overrides and distinct artifact names', () => {
    const options = windowsPackageOptions()
    expect(options.publish).toBe('never')
    expect(options.win).toEqual(['nsis', 'portable'])
    expect(options.x64).toBe(true)
    expect(options.config.npmRebuild).toBe(false)
    expect(typeof options.config.npmRebuild).toBe('boolean')
    expect(options.config.nsis.runAfterFinish).toBe(false)
    expect(typeof options.config.nsis.runAfterFinish).toBe('boolean')
    expect(options.config.nsis.artifactName).toBe('PlanciaComandi-win-${version}-${arch}-setup.${ext}')
    expect(options.config.portable.artifactName).toBe('PlanciaComandi-win-${version}-${arch}-portable.${ext}')
  })

  it('normalizes to the programmatic build keys electron-builder accepts', () => {
    const normalized = normalizeOptions(windowsPackageOptions())
    expect(Object.keys(normalized).every((key) => allowedBuildKeys.includes(key))).toBe(true)
    expect(normalized.publish).toBe('never')
    expect(normalized.win).toBeUndefined()
    expect(normalized.x64).toBeUndefined()
    expect(normalized.config.npmRebuild).toBe(false)
    expect(normalized.config.nsis.runAfterFinish).toBe(false)
    expect(normalized.config.nsis.artifactName).toBe('PlanciaComandi-win-${version}-${arch}-setup.${ext}')
    expect(normalized.config.portable.artifactName).toBe('PlanciaComandi-win-${version}-${arch}-portable.${ext}')
    const windows = [...normalized.targets.values()]
    expect(windows).toHaveLength(1)
    expect(windows[0].get(Arch.x64)).toEqual(['nsis', 'portable'])
  })
})
