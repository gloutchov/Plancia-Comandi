import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

// Only the pinned dependency's regular Mach-O files, never arbitrary commands.
const cpuTypes = { arm64: 0x0100000c, x64: 0x01000007 }
export function hasMachOArchitecture(header, arch) {
  const wanted = cpuTypes[arch]
  if (!wanted || header.length < 8) return false
  const magic = header.readUInt32BE(0)
  if (magic === 0xcffaedfe) return header.readUInt32LE(4) === wanted
  if (magic === 0xfeedfacf) return header.readUInt32BE(4) === wanted
  if (magic !== 0xcafebabe && magic !== 0xcafebabf) return false
  const count = header.readUInt32BE(4)
  const stride = magic === 0xcafebabf ? 32 : 20
  if (count > 32 || header.length < 8 + count * stride) return false
  for (let i = 0; i < count; i++) if (header.readUInt32BE(8 + i * stride) === wanted) return true
  return false
}

function regularMachO(file, arch) {
  if (!fs.lstatSync(file).isFile()) return false
  const fd = fs.openSync(file, 'r')
  try {
    const header = Buffer.alloc(4096)
    const bytes = fs.readSync(fd, header, 0, header.length, 0)
    return hasMachOArchitecture(header.subarray(0, bytes), arch)
  } finally { fs.closeSync(fd) }
}

// Static program, dependency path passed as an argument. No application main/GUI.
const probeProgram = `try {
  if (!process.versions.electron || process.arch !== process.argv[2]) process.exit(1);
  const native = { exports: {} };
  process.dlopen(native, process.argv[1]);
  if (!['fork', 'open', 'resize', 'process'].every(key => typeof native.exports[key] === 'function')) process.exit(1);
  process.stdout.write('plancia-pty-compatible');
} catch { process.exit(1); }`

/** Check architecture and actual loading in development Electron, then prepare its helper. */
export function prepareMacNodePtyPrebuild(ptyRoot, arch, electronPath, run = spawnSync) {
  try {
    if (!cpuTypes[arch]) return false
    const directory = path.join(ptyRoot, 'prebuilds', `darwin-${arch}`)
    const native = path.join(directory, 'pty.node')
    const helper = path.join(directory, 'spawn-helper')
    if (!regularMachO(native, arch) || !regularMachO(helper, arch)) return false
    const env = { ELECTRON_RUN_AS_NODE: '1' }
    for (const key of ['PATH', 'TMPDIR', 'TMP', 'TEMP']) if (process.env[key]) env[key] = process.env[key]
    const result = run(electronPath, ['-e', probeProgram, native, arch], {
      env, timeout: 5000, maxBuffer: 4096, encoding: 'utf8', windowsHide: true,
    })
    if (result.error || result.signal || result.status !== 0 || result.stdout !== 'plancia-pty-compatible') return false
    // node-pty 1.1.0 ships this helper as 0644. Change only this regular file,
    // after successful validation, preserving the rest of the dependency tree.
    const fd = fs.openSync(helper, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW)
    try {
      const stat = fs.fstatSync(fd)
      if (!stat.isFile()) return false
      const mode = stat.mode & 0o777
      if (!(mode & 0o100)) fs.fchmodSync(fd, mode | 0o111)
    } finally { fs.closeSync(fd) }
    fs.accessSync(helper, fs.constants.X_OK)
    return true
  } catch { return false }
}
