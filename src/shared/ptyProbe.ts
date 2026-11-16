import path from 'node:path'

/** Same order as node-pty loadNativeModule: build/Release, build/Debug, then prebuilds. */
export function packagedPtyNodeCandidates(resourcesPath: string, platform = process.platform, arch = process.arch): string[] {
  const root = path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'node-pty')
  const dirs = ['build/Release', 'build/Debug', path.join('prebuilds', `${platform}-${arch}`)]
  const files: string[] = []
  for (const dir of dirs) {
    files.push(path.join(root, dir, 'pty.node'))
    files.push(path.join(root, 'lib', dir, 'pty.node'))
  }
  return files
}
