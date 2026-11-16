import { createRequire } from 'node:module'
import { copyFile, lstat, mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { FuseState, FuseV1Options, FuseVersion, flipFuses } from '@electron/fuses'
import { describe, expect, it } from 'vitest'
import {
  assertManifestBinds,
  assertOnlyFuseWireDiffers,
  appBundlePath,
  assertReleaseFuses,
  assertTwinStillOpen,
  assetDigestMatches,
  copyOpenFuseTwin,
  decidedFuseStates,
  manifestLine,
  readFuseStates,
  releaseFuseConfig,
  sha256File,
} from './electron-fuses.mjs'

const require = createRequire(new URL('../package.json', import.meta.url))
const electronBinary = require('electron') as string

describe('release fuse configuration', () => {
  it('declares every Electron 45 fuse, with cookie encryption off', () => {
    const config = releaseFuseConfig()
    expect(config.version).toBe(FuseVersion.V1)
    expect(config.strictlyRequireAllFuses).toBe(true)
    expect(config.resetAdHocDarwinSignature).toBe(true)
    expect(config[FuseV1Options.RunAsNode]).toBe(false)
    expect(config[FuseV1Options.EnableCookieEncryption]).toBe(false)
    expect(config[FuseV1Options.EnableNodeOptionsEnvironmentVariable]).toBe(false)
    expect(config[FuseV1Options.EnableNodeCliInspectArguments]).toBe(false)
    expect(config[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]).toBe(true)
    expect(config[FuseV1Options.OnlyLoadAppFromAsar]).toBe(true)
    expect(config[FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]).toBe(false)
    expect(config[FuseV1Options.GrantFileProtocolExtraPrivileges]).toBe(true)
    expect(config[FuseV1Options.WasmTrapHandlers]).toBe(true)
    expect(Object.keys(decidedFuseStates())).toHaveLength(9)
  })

  it.skipIf(process.platform === 'win32')('keeps a relative framework symlink inside the twin', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'plancia-twin-link-'))
    const src = path.join(root, 'src')
    await mkdir(path.join(src, 'Versions', 'A'), { recursive: true })
    await writeFile(path.join(src, 'Versions', 'A', 'bin'), 'x')
    await symlink('A', path.join(src, 'Versions', 'Current'))
    try {
      const twin = await copyOpenFuseTwin(src)
      const target = await readlink(path.join(twin, 'Versions', 'Current'))
      expect(target).toBe('A')
      expect((await lstat(path.join(twin, 'Versions', 'Current'))).isSymbolicLink()).toBe(true)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('recognises an open twin and a macOS bundle path', () => {
    const open = decidedFuseStates()
    open[FuseV1Options.RunAsNode] = FuseState.ENABLE
    open[FuseV1Options.EnableNodeCliInspectArguments] = FuseState.ENABLE
    expect(() => assertTwinStillOpen(open)).not.toThrow()
    expect(() => assertTwinStillOpen(decidedFuseStates())).toThrow(/runAsNode/)
    const bundle = ['', 'tmp', 'Plancia Comandi.app', 'Contents', 'MacOS', 'plancia-comandi'].join(path.sep)
    expect(appBundlePath(bundle)).toBe(['', 'tmp', 'Plancia Comandi.app'].join(path.sep))
  })

  it('points electron-builder at the afterPack hook instead of the eight-fuse schema', () => {
    const config = require('node:fs').readFileSync(new URL('../electron-builder.json5', import.meta.url), 'utf8') as string
    expect(config).toContain('scripts/after-pack-fuses.mjs')
    expect(config).not.toContain('electronFuses:')
  })

  it('flips a copy of the Electron binary and changes only the fuse wire', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'plancia-fuse-copy-'))
    const openCopy = path.join(root, 'electron-open')
    const releaseCopy = path.join(root, 'electron-release')
    await copyFile(electronBinary, openCopy)
    await copyFile(electronBinary, releaseCopy)
    try {
      const states = await readFuseStates(releaseCopy)
      expect(states[FuseV1Options.WasmTrapHandlers]).toBe(FuseState.ENABLE)
      await flipFuses(releaseCopy, releaseFuseConfig())
      assertReleaseFuses(await readFuseStates(releaseCopy))
      const open = await readFile(openCopy)
      const release = await readFile(releaseCopy)
      assertOnlyFuseWireDiffers(open, release)
      const partial = releaseFuseConfig()
      delete partial[FuseV1Options.WasmTrapHandlers]
      const strictCopy = path.join(root, 'electron-strict')
      await copyFile(electronBinary, strictCopy)
      await expect(flipFuses(strictCopy, partial)).rejects.toThrow(/strictlyRequireAllFuses/)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 60000)

  it('binds a tested file hash to the manifest and to an asset digest', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'plancia-sha-'))
    const file = path.join(root, 'PlanciaComandi-win-0.3.8-x64-portable.exe')
    await writeFile(file, 'synthetic-package')
    try {
      const hash = await sha256File(file)
      const line = manifestLine(hash, path.basename(file))
      assertManifestBinds(`${line}\n`, hash, path.basename(file))
      expect(assetDigestMatches(hash, hash.toUpperCase())).toBe(true)
      expect(assetDigestMatches(hash, `sha256:${hash}`)).toBe(true)
      expect(assetDigestMatches(hash, '0'.repeat(64))).toBe(false)
      expect(() => assertManifestBinds(`${'a'.repeat(64)}  other.exe\n`, hash, path.basename(file))).toThrow(/does not bind/)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
