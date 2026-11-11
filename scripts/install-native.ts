/**
 * Windows can use the N-API prebuilds shipped with node-pty 1.1.0.
 * node-pty 1.1.0 has no Linux prebuild, and macOS still rebuilds for Electron
 * so those platforms keep the previous install path.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const WINDOWS_NODE_PTY_FILES = ['pty.node', 'conpty.node', 'conpty_console_list.node'] as const

export function windowsPrebuildDir(ptyRoot: string, arch: string): string {
  return path.join(ptyRoot, 'prebuilds', `win32-${arch}`)
}

export function hasWindowsNodePtyPrebuild(
  ptyRoot: string,
  arch: string,
  existsSync: (file: string) => boolean = fs.existsSync,
): boolean {
  const dir = windowsPrebuildDir(ptyRoot, arch)
  return WINDOWS_NODE_PTY_FILES.every((name) => existsSync(path.join(dir, name)))
}

/** True when electron-builder must compile native modules for Electron. */
export function shouldRebuildForElectron(
  platform: string,
  ptyRoot: string,
  arch: string,
  existsSync: (file: string) => boolean = fs.existsSync,
): boolean {
  if (platform === 'win32' && hasWindowsNodePtyPrebuild(ptyRoot, arch, existsSync)) return false
  return true
}

function repoRoot(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
}

function rebuildForElectron(root: string): void {
  const cli = path.join(root, 'node_modules', 'electron-builder', 'cli.js')
  const result = spawnSync(process.execPath, [cli, 'install-app-deps'], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  process.exit(result.status ?? 1)
}

function main(): void {
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
