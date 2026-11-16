import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { assertConptyHostFiles, CONPTY_HOST_FILES, packageNeedsConptyHostCheck, packageSourceDir, packagedConptyFile, sourceConptyFile } from './conpty-host-files.mjs'

describe('unpacked ConPTY host files', () => {
  it('requires the packaged bytes to match the checkout prebuild', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'plancia-conpty-host-'))
    const source = path.join(root, 'source')
    const resources = path.join(root, 'resources')
    try {
      for (const relative of CONPTY_HOST_FILES) {
        const bytes = Buffer.from(`host-${relative}`)
        mkdirSync(path.dirname(sourceConptyFile(source, relative)), { recursive: true })
        mkdirSync(path.dirname(packagedConptyFile(resources, relative)), { recursive: true })
        writeFileSync(sourceConptyFile(source, relative), bytes)
        writeFileSync(packagedConptyFile(resources, relative), bytes)
      }
      const checked = assertConptyHostFiles(resources, source, readFileSync)
      expect(checked.map((item) => item.relative)).toEqual([...CONPTY_HOST_FILES])
      writeFileSync(packagedConptyFile(resources, CONPTY_HOST_FILES[0]), Buffer.from('changed'))
      expect(() => assertConptyHostFiles(resources, source, readFileSync)).toThrow(/hash differs/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('skips conpty.dll and OpenConsole.exe on darwin and checks them on win32', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'plancia-conpty-gate-'))
    const source = path.join(root, 'source')
    const mac = path.join(root, 'plancia-comandi.app', 'Contents', 'Resources')
    const windows = path.join(root, 'win-unpacked', 'resources')
    const linux = path.join(root, 'linux-unpacked', 'resources')
    const reads = []
    const read = (file) => {
      reads.push(file)
      return readFileSync(file)
    }
    try {
      for (const relative of CONPTY_HOST_FILES) {
        const bytes = Buffer.from(`host-${relative}`)
        mkdirSync(path.dirname(sourceConptyFile(source, relative)), { recursive: true })
        mkdirSync(path.dirname(packagedConptyFile(windows, relative)), { recursive: true })
        writeFileSync(sourceConptyFile(source, relative), bytes)
        writeFileSync(packagedConptyFile(windows, relative), bytes)
      }
      expect(packageNeedsConptyHostCheck(mac, 'darwin')).toBe(false)
      expect(packageNeedsConptyHostCheck(mac, 'win32')).toBe(false)
      expect(packageNeedsConptyHostCheck(linux, 'linux')).toBe(false)
      expect(packageNeedsConptyHostCheck(windows, 'darwin')).toBe(false)
      expect(packageNeedsConptyHostCheck(windows, 'win32')).toBe(true)
      if (packageNeedsConptyHostCheck(mac, 'darwin')) assertConptyHostFiles(mac, source, read)
      expect(reads).toEqual([])
      const checked = assertConptyHostFiles(windows, source, read)
      expect(checked.map((item) => item.relative)).toEqual([...CONPTY_HOST_FILES])
      expect(reads.some((file) => file.endsWith(`${path.sep}conpty.dll`))).toBe(true)
      expect(reads.some((file) => file.endsWith(`${path.sep}OpenConsole.exe`))).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('resolves the app checkout from the script location, not the working directory', () => {
    const script = pathToFileURL(path.join('/workspace/tooling/scripts/smoke-package.mjs')).href
    const appPrebuilds = path.join(path.resolve('/workspace/app'), 'node_modules', 'node-pty', 'prebuilds')
    const hasPrebuilds = (file) => file === appPrebuilds
    expect(packageSourceDir(script, {}, hasPrebuilds)).toBe(path.resolve('/workspace/app'))
    const local = pathToFileURL(path.join('/repo/scripts/smoke-package.mjs')).href
    const repoPrebuilds = path.join(path.resolve('/repo'), 'node_modules', 'node-pty', 'prebuilds')
    const localPrebuilds = (file) => file === repoPrebuilds
    expect(packageSourceDir(local, {}, localPrebuilds)).toBe(path.resolve('/repo'))
    const override = path.resolve('/explicit/app')
    const explicit = (file) => file === path.join(override, 'node_modules', 'node-pty', 'prebuilds')
    expect(packageSourceDir(script, { PLANCIA_SOURCE_DIR: override }, explicit)).toBe(override)
    expect(() => packageSourceDir(script, {}, () => false)).toThrow(/node_modules\/node-pty\/prebuilds/)
  })
})
