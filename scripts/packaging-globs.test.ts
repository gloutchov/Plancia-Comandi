import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

// Exercise the public APIs resolved by the actual packaging consumers after
// the scoped minimatch override, without depending on their private classes.
describe.each(['app-builder-lib', '@electron/universal'])('%s glob compatibility', (consumer) => {
  const { Minimatch, minimatch } = createRequire(require.resolve(consumer))('minimatch')

  it('matches nested and hidden build output without crossing into another bundle', () => {
    const pattern = new Minimatch('dist/**/*', { dot: true })
    expect(pattern.match('dist/assets/index.js')).toBe(true)
    expect(pattern.match('dist/.metadata/build.json')).toBe(true)
    expect(pattern.match('dist-electron/main.js')).toBe(false)
  })

  it('selects native PTY files for unpacking and preserves negation', () => {
    const native = new Minimatch('**/node_modules/node-pty/**/*', { dot: true })
    expect(native.match('node_modules/node-pty/prebuilds/win32-x64/pty.node')).toBe(true)
    expect(native.match('node_modules/node-pty/prebuilds/win32-x64/conpty/conpty.dll')).toBe(true)
    expect(native.match('node_modules/node-pty/prebuilds/win32-x64/conpty/OpenConsole.exe')).toBe(true)
    expect(native.match('node_modules/node-pty/build/Release/pty.node')).toBe(true)
    expect(native.match('node_modules/another-module/index.js')).toBe(false)
    const source = new Minimatch('!**/*.map', { dot: true })
    expect(source.match('dist/index.js')).toBe(true)
    expect(source.match('dist/index.js.map')).toBe(false)
  })

  it('supports named minimatch calls with matchBase and paths containing spaces', () => {
    expect(minimatch('native modules/pty.node', '*.node', { matchBase: true })).toBe(true)
    expect(minimatch('Frameworks/Electron Framework.framework/Electron Framework', 'Electron Framework', { matchBase: true })).toBe(true)
    expect(minimatch('native modules/pty.json', '*.node', { matchBase: true })).toBe(false)
  })
})
