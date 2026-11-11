import { describe, expect, it } from 'vitest'
import { hasWindowsNodePtyPrebuild, shouldRebuildForElectron, windowsPrebuildDir } from '../../scripts/install-native'

function filesFor(root: string, arch: string): Set<string> {
  const dir = windowsPrebuildDir(root, arch)
  return new Set(['pty.node', 'conpty.node', 'conpty_console_list.node'].map((name) => `${dir}/${name}`))
}

describe('shouldRebuildForElectron', () => {
  const root = '/app/node_modules/node-pty'

  it('skips the Electron rebuild on Windows when the three prebuilds exist', () => {
    const present = filesFor(root, 'x64')
    const exists = (file: string) => present.has(file)
    expect(hasWindowsNodePtyPrebuild(root, 'x64', exists)).toBe(true)
    expect(shouldRebuildForElectron('win32', root, 'x64', exists)).toBe(false)
  })

  it('rebuilds on Windows when a prebuild file is missing', () => {
    const present = filesFor(root, 'x64')
    present.delete(`${windowsPrebuildDir(root, 'x64')}/conpty.node`)
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
