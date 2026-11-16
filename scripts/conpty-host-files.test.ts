import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { assertConptyHostFiles, CONPTY_HOST_FILES, packageSourceDir, packagedConptyFile, sourceConptyFile } from './conpty-host-files.mjs'

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

  it('resolves the app checkout from the script location, not the working directory', () => {
    const script = pathToFileURL(path.join('/workspace/tooling/scripts/smoke-package.mjs')).href
    const hasPrebuilds = (file) => file.replaceAll('\\', '/') === '/workspace/app/node_modules/node-pty/prebuilds'
    expect(packageSourceDir(script, {}, hasPrebuilds)).toBe(path.resolve('/workspace/app'))
    const local = pathToFileURL(path.join('/repo/scripts/smoke-package.mjs')).href
    const localPrebuilds = (file) => file.replaceAll('\\', '/') === '/repo/node_modules/node-pty/prebuilds'
    expect(packageSourceDir(local, {}, localPrebuilds)).toBe(path.resolve('/repo'))
    const override = path.resolve('/explicit/app')
    const explicit = (file) => file.replaceAll('\\', '/') === `${override.replaceAll('\\', '/')}/node_modules/node-pty/prebuilds`
    expect(packageSourceDir(script, { PLANCIA_SOURCE_DIR: override }, explicit)).toBe(override)
    expect(() => packageSourceDir(script, {}, () => false)).toThrow(/node_modules\/node-pty\/prebuilds/)
  })
})
