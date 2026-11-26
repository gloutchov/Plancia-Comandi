import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { windowsAppUserModelId } from '../electron/windowsAppIdentity'
import { isWindowsAppExe, MAC_APP_NAME, WINDOWS_APP_EXE } from './packaged-app-names.mjs'
import { fuseTarget } from './electron-fuses.mjs'

const require = createRequire(import.meta.url)
const config = require('json5').parse(readFileSync(new URL('../electron-builder.json5', import.meta.url), 'utf8'))
const metadata = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const { AppInfo } = require('app-builder-lib/out/appInfo.js')
const { UUID } = require('builder-util-runtime')

describe('packaged app identity', () => {
  it('uses the spaced product filename in the actual builder on Windows and macOS', () => {
    for (const platform of ['win', 'mac']) {
      const info = new AppInfo({ config, metadata }, undefined, config[platform])
      expect(info.productName).toBe('Plancia Comandi')
      expect(info.productFilename).toBe('Plancia Comandi')
    }
    expect(WINDOWS_APP_EXE).toBe(`${config.executableName}.exe`)
    expect(MAC_APP_NAME).toBe(`${config.executableName}.app`)
    expect(config.linux.executableName).toBe('plancia-comandi')
  })

  it('uses distinct Windows development and release identities and retains the legacy installer GUID', () => {
    const windows = new AppInfo({ config, metadata }, undefined, config.win)
    const mac = new AppInfo({ config, metadata }, undefined, config.mac)
    expect(windows.id).toBe('it.plancia.comandi.Desktop')
    expect(windowsAppUserModelId(true)).toBe(windows.id)
    expect(windowsAppUserModelId(false)).toBe('it.plancia.comandi.Dev')
    expect(mac.id).toBe('it.plancia.comandi')
    const nsisNamespace = UUID.parse('50e065bc-3134-11e6-9bab-38c9862bdaf3')
    expect(config.nsis.guid).toBe(UUID.v5('it.plancia.comandi', nsisNamespace))
  })

  it('includes the native Windows ICO alongside the PNG and provides multiple icon sizes', () => {
    expect(config.files).toContain('build/icon.ico')
    const ico = readFileSync(new URL('../build/icon.ico', import.meta.url))
    expect(ico.readUInt16LE(2)).toBe(1)
    const count = ico.readUInt16LE(4)
    const sizes = Array.from({ length: count }, (_, index) => ico[6 + index * 16] || 256)
    expect(sizes).toEqual(expect.arrayContaining([16, 32, 48, 256]))
  })

  it('provides the Windows Shell with the canonical ICO outside ASAR', () => {
    expect(config.win.extraResources).toContainEqual({ from: 'build/icon.ico', to: 'icon.ico' })
  })

  it('recognizes current and legacy names without matching unrelated executables', () => {
    for (const name of ['Plancia Comandi.exe', 'PLANCIA COMANDI.EXE', 'plancia-comandi.exe']) expect(isWindowsAppExe(name)).toBe(true)
    for (const name of ['Other Plancia Comandi.exe', 'PlanciaComandi.exe', '', 'helper.exe']) expect(isWindowsAppExe(name)).toBe(false)
  })

  it('selects the actual current or legacy Windows binary for fuse protection and rejects ambiguity', () => {
    for (const exe of ['Plancia Comandi.exe', 'plancia-comandi.exe']) {
      expect(fuseTarget('root', 'win32', ['resources', exe])).toBe(require('node:path').join('root', exe))
    }
    expect(() => fuseTarget('root', 'win32', ['Other.exe'])).toThrow(/Expected one Windows app/)
    expect(() => fuseTarget('root', 'win32', ['Plancia Comandi.exe', 'plancia-comandi.exe'])).toThrow(/Expected one Windows app/)
  })
})
