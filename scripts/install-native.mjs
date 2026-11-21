/**
 * Windows can use the N-API prebuilds shipped with node-pty 1.1.0.
 * macOS skips rebuilding only after a real development-Electron load probe
 * and preparation of the matching spawn-helper. Linux keeps its rebuild path.
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { prepareMacNodePtyPrebuild } from './macos-prebuild.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** @type {readonly ['pty.node', 'conpty.node', 'conpty_console_list.node']} */
export const WINDOWS_NODE_PTY_FILES = ['pty.node', 'conpty.node', 'conpty_console_list.node']

/**
 * @param {string} ptyRoot
 * @param {string} arch
 */
export function windowsPrebuildDir(ptyRoot, arch) {
  return path.join(ptyRoot, 'prebuilds', `win32-${arch}`)
}

/**
 * @param {string} ptyRoot
 * @param {string} arch
 * @param {(file: string) => boolean} [existsSync]
 */
export function hasWindowsNodePtyPrebuild(ptyRoot, arch, existsSync = fs.existsSync) {
  const dir = windowsPrebuildDir(ptyRoot, arch)
  return WINDOWS_NODE_PTY_FILES.every((name) => existsSync(path.join(dir, name)))
}

/**
 * True when electron-builder must compile native modules for Electron.
 * Darwin requires a successful compatibility probe; Linux always rebuilds.
 * Windows skips only when all three prebuilds exist.
 * @param {string} platform
 * @param {string} ptyRoot
 * @param {string} arch
 * @param {(file: string) => boolean} [existsSync]
 * @param {(root: string, arch: string) => boolean} [macProbe]
 */
export function shouldRebuildForElectron(platform, ptyRoot, arch, existsSync = fs.existsSync, macProbe = () => false) {
  if (platform === 'win32' && hasWindowsNodePtyPrebuild(ptyRoot, arch, existsSync)) return false
  if (platform === 'darwin') return !macProbe(ptyRoot, arch)
  return true
}

function repoRoot() {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
}

/** @param {string} root */
function rebuildForElectron(root) {
  const cli = path.join(root, 'node_modules', 'electron-builder', 'cli.js')
  const result = spawnSync(process.execPath, [cli, 'install-app-deps'], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  process.exit(result.status ?? 1)
}

function main() {
  const root = repoRoot()
  const ptyRoot = path.join(root, 'node_modules', 'node-pty')
  const probe = (candidate, arch) => {
    try {
      const require = createRequire(path.join(root, 'package.json'))
      return prepareMacNodePtyPrebuild(candidate, arch, require('electron'))
    } catch { return false }
  }
  if (!shouldRebuildForElectron(process.platform, ptyRoot, process.arch, fs.existsSync, probe)) {
    console.log(
      `node-pty prebuild for ${process.platform}-${process.arch} is present; skipping the Electron rebuild.`,
    )
    return
  }
  rebuildForElectron(root)
}

// Node resolves symlinks for import.meta.url (including macOS /var -> /private/var).
let invoked = false
try {
  invoked = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === fs.realpathSync(path.resolve(process.argv[1]))
} catch { /* Importing the helpers does not require an existing CLI argument. */ }
if (invoked) main()
