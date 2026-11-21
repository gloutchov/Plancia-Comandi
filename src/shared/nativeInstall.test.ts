import fs from 'node:fs'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasWindowsNodePtyPrebuild, shouldRebuildForElectron, windowsPrebuildDir } from '../../scripts/install-native.mjs'

function filesFor(root: string, arch: string): Set<string> {
  const dir = windowsPrebuildDir(root, arch)
  return new Set(['pty.node', 'conpty.node', 'conpty_console_list.node'].map((name) => path.join(dir, name)))
}

describe('shouldRebuildForElectron', () => {
  it.skipIf(process.platform !== 'win32')('runs the actual Windows postinstall from a path with spaces without a compiler', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'plancia-native entry-'))
    try {
      fs.mkdirSync(path.join(fixture, 'scripts'), { recursive: true })
      const prebuild = windowsPrebuildDir(path.join(fixture, 'node_modules/node-pty'), process.arch)
      fs.mkdirSync(prebuild, { recursive: true })
      for (const name of ['pty.node', 'conpty.node', 'conpty_console_list.node']) fs.writeFileSync(path.join(prebuild, name), '')
      for (const name of ['install-native.mjs', 'macos-prebuild.mjs']) fs.copyFileSync(path.join(process.cwd(), 'scripts', name), path.join(fixture, 'scripts', name))
      const result = spawnSync(process.execPath, [path.join(fixture, 'scripts/install-native.mjs')], {
        cwd: fixture, timeout: 5000, maxBuffer: 8192, encoding: 'utf8',
        env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
      })
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('skipping the Electron rebuild')
    } finally { fs.rmSync(fixture, { recursive: true, force: true }) }
  })

  const root = '/app/node_modules/node-pty'

  it('skips the Electron rebuild on Windows when the three prebuilds exist', () => {
    const present = filesFor(root, 'x64')
    const exists = (file: string) => present.has(file)
    expect(hasWindowsNodePtyPrebuild(root, 'x64', exists)).toBe(true)
    expect(shouldRebuildForElectron('win32', root, 'x64', exists)).toBe(false)
  })

  it('rebuilds on Windows when a prebuild file is missing', () => {
    const present = filesFor(root, 'x64')
    present.delete(path.join(windowsPrebuildDir(root, 'x64'), 'conpty.node'))
    const exists = (file: string) => present.has(file)
    expect(shouldRebuildForElectron('win32', root, 'x64', exists)).toBe(true)
  })

  it('keeps rebuilding on Linux and macOS even if a Windows prebuild is present', () => {
    const present = filesFor(root, 'x64')
    const exists = (file: string) => present.has(file)
    expect(shouldRebuildForElectron('linux', root, 'x64', exists)).toBe(true)
    expect(shouldRebuildForElectron('darwin', root, 'arm64', exists)).toBe(true)
  })

  it('checks the Windows architecture that is actually running', () => {
    const present = filesFor(root, 'arm64')
    const exists = (file: string) => present.has(file)
    expect(shouldRebuildForElectron('win32', root, 'arm64', exists)).toBe(false)
    expect(shouldRebuildForElectron('win32', root, 'x64', exists)).toBe(true)
  })
})
