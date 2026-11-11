/**
 * Windows can use the N-API prebuilds shipped with node-pty 1.1.0.
 * node-pty 1.1.0 has no Linux prebuild, and macOS still rebuilds for Electron
 * so those platforms keep the previous install path.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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
 * Darwin and Linux always rebuild. Windows skips only when all three prebuilds exist.
 * @param {string} platform
 * @param {string} ptyRoot
 * @param {string} arch
 * @param {(file: string) => boolean} [existsSync]
 */
export function shouldRebuildForElectron(platform, ptyRoot, arch, existsSync = fs.existsSync) {
  if (platform === 'win32' && hasWindowsNodePtyPrebuild(ptyRoot, arch, existsSync)) return false
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
  if (!shouldRebuildForElectron(process.platform, ptyRoot, process.arch)) {
    console.log(
      `node-pty prebuild for ${process.platform}-${process.arch} is present; skipping the Electron rebuild.`,
    )
    return
  }
  rebuildForElectron(root)
}

const invoked = process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (invoked) main()
