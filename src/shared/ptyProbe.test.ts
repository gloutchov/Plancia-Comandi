import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { packagedPtyNodeCandidates } from './ptyProbe'

describe('packaged pty probe', () => {
  it('checks the prebuild node-pty loads on Windows before reporting the file missing', () => {
    const resources = path.join('resources')
    const files = packagedPtyNodeCandidates(resources, 'win32', 'x64')
    expect(files[0].replaceAll('\\', '/')).toBe('resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node')
    expect(files.some((file) => file.replaceAll('\\', '/').endsWith('node_modules/node-pty/prebuilds/win32-x64/pty.node'))).toBe(true)
    expect(files.some((file) => file.replaceAll('\\', '/').includes('build/Release/pty.node'))).toBe(true)
  })
})