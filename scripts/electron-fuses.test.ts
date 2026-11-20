import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { copyFile, lstat, mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import path from 'node:path'
import { FuseState, FuseV1Options, FuseVersion, flipFuses } from '@electron/fuses'
import { describe, expect, it } from 'vitest'
import {
  assertManifestBinds,
  assertOnlyFuseWireDiffers,
  appBundlePath,
  assertReleaseFuses,
  assertDefaultFuses,
  assertTwinStillOpen,
  assetDigestMatches,
  copyOpenFuseTwin,
  decidedFuseStates,
  fileImportHref,
  fileImportHrefWin32,
  hasFuseSentinel,
  loadFuses,
  portableFuseDecision,
  pathToFuseFile,
  prepareOpenFuseTwin,
  resolveAppPackageJson,
  manifestLine,
  readFuseStates,
  releaseFuseConfig,
  sha256File,
  variantFuseConfig,
} from './electron-fuses.mjs'

const require = createRequire(new URL('../package.json', import.meta.url))
// On macOS the fuse wire is in Electron Framework, not the small app launcher.
const electronBinary = pathToFuseFile(require('electron') as string)

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

  it('default wire matches the unpacked Electron binary', async () => {
    assertDefaultFuses(await readFuseStates(electronBinary))
  })

  it.skipIf(process.platform === 'darwin')('resets the finished binary, so only the fuse wire differs', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'plancia-prepare-'))
    const finalDir = path.join(root, 'final')
    await mkdir(finalDir)
    const name = process.platform === 'win32' ? 'plancia-comandi.exe' : 'plancia-comandi'
    const release = path.join(finalDir, name)
    await copyFile(electronBinary, release)
    try {
      await flipFuses(release, releaseFuseConfig())
      await prepareOpenFuseTwin(finalDir)
      const twin = path.join(`${finalDir}-open-fuses`, name)
      assertDefaultFuses(await readFuseStates(twin))
      assertOnlyFuseWireDiffers(await readFile(twin), await readFile(release))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 60000)

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

  it('resolves @electron/fuses from the app package when the working directory has none', () => {
    const empty = mkdtempSync(path.join(os.tmpdir(), 'plancia-tooling-'))
    const script = fileURLToPath(new URL('./electron-fuses.mjs', import.meta.url))
    const verify = fileURLToPath(new URL('./verify-sha256-manifest.mjs', import.meta.url))
    const smoke = fileURLToPath(new URL('./smoke-fuses.mjs', import.meta.url))
    try {
      expect(resolveAppPackageJson(empty)).toMatch(/package\.json$/)
      expect(loadFuses(empty).pathToFuseFile).toBeTypeOf('function')
      for (const file of [verify, smoke]) {
        const href = fileImportHref(file)
        expect(href.startsWith('file:')).toBe(true)
        const loaded = spawnSync(process.execPath, ['--input-type=module', '-e', `import ${JSON.stringify(href)}`], { cwd: empty, encoding: 'utf8' })
        expect(loaded.stderr).toContain('Usage:')
        expect(loaded.stderr).not.toContain('Cannot find package')
        expect(loaded.stderr).not.toContain('ERR_UNSUPPORTED_ESM_URL_SCHEME')
      }
      const smokeSource = readFileSync(smoke, 'utf8')
      expect(smokeSource).not.toContain('expectNodeOptions(executable, open)')
      expect(smokeSource).toContain('durationMs')
      expect(smokeSource).toContain('smoke-failure.json')
      expect(smokeSource).toContain('Release startup failed')
      expect(smokeSource).toContain('release-startup')
      const launchSource = readFileSync(fileURLToPath(new URL('./fuse-smoke-launch.mjs', import.meta.url)), 'utf8')
      expect(launchSource).toContain('prepareIsolatedSmokeRoot')
      expect(launchSource).not.toContain('ELECTRON_NO_ATTACH_CONSOLE')
      expect(launchSource).not.toContain('ELECTRON_ENABLE_LOGGING')
      expect(launchSource).toContain('windowsHide: false')
      expect(smokeSource).toContain('reap')
      expect(smokeSource).not.toContain('extraEnv, root')
      expect(smokeSource).not.toContain('if (handle.state.exited) return')
      expect(readFileSync(script, 'utf8')).not.toContain("from '@electron/fuses'")
      expect(readFileSync(smoke, 'utf8')).not.toContain("from '@electron/fuses'")
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })

  it('turns one default fuse on for a startup variant', () => {
    const { FuseV1Options } = loadFuses()
    const integrity = variantFuseConfig('integrity')
    const asar = variantFuseConfig('asar')
    const both = variantFuseConfig('both')
    expect(integrity[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]).toBe(true)
    expect(integrity[FuseV1Options.OnlyLoadAppFromAsar]).toBe(false)
    expect(integrity[FuseV1Options.RunAsNode]).toBe(true)
    expect(asar[FuseV1Options.OnlyLoadAppFromAsar]).toBe(true)
    expect(asar[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]).toBe(false)
    expect(both[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]).toBe(true)
    expect(both[FuseV1Options.OnlyLoadAppFromAsar]).toBe(true)
    expect(() => variantFuseConfig('release')).toThrow(/Unknown fuse variant/)
  })

  it('imports a Windows drive path as a file URL', () => {
    const raw = 'D:\\a\\Plancia\\scripts\\smoke-fuses.mjs'
    expect(new URL(raw).protocol).toBe('d:')
    expect(fileImportHrefWin32(raw)).toBe('file:///D:/a/Plancia/scripts/smoke-fuses.mjs')
    expect(fileImportHrefWin32('\\\\server\\share\\scripts\\smoke-fuses.mjs')).toBe('file://server/share/scripts/smoke-fuses.mjs')
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
    const windows = require('node:fs').readFileSync(new URL('../.github/workflows/package-windows.yml', import.meta.url), 'utf8') as string
    expect(windows).toContain('check-fuse-wires.mjs')
    expect(windows).toContain('diagnose-fuse-variants.mjs')
    expect(windows).toContain('plancia-fuse-variants/variants.json')
    expect(windows).toContain('plancia-fuse-smoke-*/smoke-failure.json')
    expect(windows).toContain('smoke-package.mjs app/release/win-unpacked/plancia-comandi.exe "$env:EXPECTED_VERSION" release')
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

  it('refuses a portable wrapper that has no Electron fuse sentinel', () => {
    const wrapper = Buffer.from('MZ-not-an-electron-binary')
    expect(hasFuseSentinel(wrapper)).toBe(false)
    expect(hasFuseSentinel(readFileSync(electronBinary))).toBe(true)
    expect(() => portableFuseDecision({
      baseName: 'PlanciaComandi-win-0.3.8-x64-portable.exe',
      hasSentinel: false,
      nestedSentinel: false,
    })).toThrow(/no Electron fuse sentinel/)
    expect(portableFuseDecision({
      baseName: 'PlanciaComandi-win-0.3.8-x64-portable.exe',
      hasSentinel: false,
      nestedSentinel: true,
    })).toBe('extracted')
    expect(portableFuseDecision({ baseName: 'plancia-comandi.exe', hasSentinel: true })).toBe('direct')
  })

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
