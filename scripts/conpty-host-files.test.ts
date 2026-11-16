import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertConptyHostFiles, CONPTY_HOST_FILES, packagedConptyFile, sourceConptyFile } from './conpty-host-files.mjs'

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
})
