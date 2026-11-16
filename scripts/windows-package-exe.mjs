import { spawn } from 'node:child_process'
import { access, mkdtemp, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

function runTool(command, args, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    const timer = setTimeout(() => { child.kill(); resolve({ code: null, output: output.slice(-400) }) }, timeoutMs)
    child.stdout?.on('data', (chunk) => { output = (output + chunk).slice(-2000) })
    child.stderr?.on('data', (chunk) => { output = (output + chunk).slice(-2000) })
    child.once('error', (error) => { clearTimeout(timer); resolve({ code: null, output: String(error.message || error).slice(0, 300) }) })
    child.once('exit', (code) => { clearTimeout(timer); resolve({ code, output: output.slice(-400) }) })
  })
}

async function sevenZip() {
  const candidates = process.platform === 'win32'
    ? ['7z', 'C:\\Program Files\\7-Zip\\7z.exe']
    : ['7z']
  for (const candidate of candidates) {
    const probe = await runTool(candidate, [], 8000)
    if (!/ENOENT|not found/i.test(probe.output)) return candidate
  }
  return null
}

async function findAppExe(root) {
  const found = []
  async function walk(dir, depth) {
    if (depth > 5 || found.length > 8) return
    let entries = []
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full, depth + 1)
      else if (entry.name.toLowerCase() === 'plancia-comandi.exe') found.push(full)
    }
  }
  await walk(root, 0)
  for (const exe of found) {
    try {
      await access(path.join(path.dirname(exe), 'resources', 'app.asar'))
      return exe
    } catch { /* a helper without the archive */ }
  }
  return null
}

/** electron-builder portable is a 7z SFX. The app exe is inside a nested 7z. */
export async function extractWindowsElectronExe(archive) {
  const zip = await sevenZip()
  if (!zip) throw new Error('7z is required to read fuses from the portable wrapper')
  const extracted = await mkdtemp(path.join(os.tmpdir(), 'plancia-portable-exe-'))
  try {
    await runTool(zip, ['x', archive, `-o${extracted}`, '-y'], 120000)
    let exe = await findAppExe(extracted)
    if (!exe) {
      const nested = []
      async function walkArchives(dir, depth) {
        if (depth > 3 || nested.length > 4) return
        let entries = []
        try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
        for (const entry of entries) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) await walkArchives(full, depth + 1)
          else if (entry.name.toLowerCase().endsWith('.7z')) nested.push(full)
        }
      }
      await walkArchives(extracted, 0)
      for (const archiveFile of nested) {
        await runTool(zip, ['x', archiveFile, `-o${archiveFile}-unpacked`, '-y'], 120000)
      }
      exe = await findAppExe(extracted)
    }
    if (!exe) throw new Error('Portable wrapper has no Electron fuse sentinel and the nested executable was not found')
    return { dir: extracted, exe }
  } catch (error) {
    await rm(extracted, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}
