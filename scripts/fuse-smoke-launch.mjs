import { execFile, spawn } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { prepareIsolatedSmokeRoot } from './smoke-driver.mjs'

export const STARTUP_HOLD_MS = 3000
const LOG_FILES = 6
const LOG_BYTES = 4096

export function isDiagnosticFile(name) {
  return /\.(log|dmp)$/i.test(name) || /crash/i.test(name) || name === 'startup.jsonl'
}

export function launchArgs(_profile, args) {
  return args
}

export async function prepareIsolatedCase(dir, { startupTrace = false } = {}) {
  const prepared = await prepareIsolatedSmokeRoot(dir)
  const env = { ...prepared.env }
  if (startupTrace) {
    env.PLANCIA_DIAG_STARTUP = '1'
    env.PLANCIA_DIAG_DIR = dir
  }
  return { dir, env, userData: prepared.userData, startupTrace }
}

export function startupCrashEvents(lines) {
  return (Array.isArray(lines) ? lines : [])
    .filter(line => line && (line.event === 'uncaughtException' || line.event === 'unhandledRejection'))
    .map(line => line.event)
}

export async function readStartupTrace(dir) {
  try {
    const text = await readFile(path.join(dir, 'startup.jsonl'), 'utf8')
    return text.split('\n').filter(Boolean).slice(-48).map((line) => {
      try { return JSON.parse(line) } catch { return { raw: line.slice(0, 200) } }
    })
  } catch { return [] }
}

const preexistingByExecutable = new Map()

/** Reap only this probe's exact executable, preserving instances present at
 * its first call. Name-based cleanup can terminate a personal app or another
 * simultaneous probe, especially now that the app name contains spaces. */
export async function reapAppImages(executable) {
  if (!path.isAbsolute(executable)) throw new Error('An absolute probe executable is required')
  const key = process.platform === 'win32' ? executable.toLowerCase() : executable
  const current = await appPids(executable)
  if (!preexistingByExecutable.has(key)) preexistingByExecutable.set(key, new Set(current))
  const preexisting = preexistingByExecutable.get(key)
  const listed = current.filter(pid => !preexisting.has(pid))
  for (const pid of listed) {
    if (process.platform === 'win32') await taskkill(pid)
    else try { process.kill(pid, 'SIGTERM') } catch { /* already gone */ }
  }
  const deadline = Date.now() + 3000
  let after = listed.length ? (await appPids(executable)).filter(pid => !preexisting.has(pid)) : []
  while (after.length && Date.now() < deadline) {
    await delay(100)
    after = (await appPids(executable)).filter(pid => !preexisting.has(pid))
  }
  return { before: listed, after, preserved: [...preexisting] }
}

function execText(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { windowsHide: true, timeout: 8000, encoding: 'utf8' }, (error, stdout, stderr) => {
      resolve(`${stdout || ''}${error && !stdout ? stderr || '' : ''}`)
    })
  })
}

export async function appPids(executable) {
  if (process.platform === 'win32') {
    const literal = `'${executable.replaceAll("'", "''")}'`
    const text = await execText('powershell.exe', ['-NoProfile', '-Command',
      `Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq ${literal} } | ForEach-Object { $_.ProcessId }`])
    return [...new Set(text.split(/\s+/).map(Number).filter(pid => Number.isInteger(pid) && pid > 0))]
  }
  const text = await execText('ps', ['-eo', 'pid=,args='])
  const pids = []
  for (const line of text.split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(.*)$/)
    if (!match) continue
    const args = match[2]
    if (args === executable || args.startsWith(`${executable} `)) pids.push(Number(match[1]))
  }
  return pids
}

async function taskkill(pid) {
  await new Promise((resolve) => {
    const killer = spawn('taskkill.exe', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
    killer.once('exit', resolve)
    killer.once('error', resolve)
  })
}

export function spawnTracked(executable, args, profile, extraEnv = {}, cwd = profile.dir) {
  const child = spawn(executable, args, {
    cwd,
    env: { ...profile.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false,
  })
  const state = { output: '', code: null, signal: null, exited: false, error: null, pid: child.pid ?? null }
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => { state.output = (state.output + chunk.toString()).slice(-4000) })
  }
  child.once('exit', (code, signal) => { state.exited = true; state.code = code; state.signal = signal })
  child.once('error', (error) => { state.exited = true; state.error = error.message })
  return { child, state, executable, profile, stopped: false, remaining: [] }
}

export async function stillRunning(handle) {
  if (!handle.state.exited) return true
  handle.remaining = await appPids(handle.executable)
  return handle.remaining.length > 0
}

export async function stopTracked(handle) {
  if (!handle || handle.stopped) return
  handle.stopped = true
  const pid = handle.state.pid
  if (process.platform === 'win32' && pid) await taskkill(pid)
  else if (!handle.state.exited) handle.child.kill('SIGTERM')
  const deadline = Date.now() + 8000
  while (!handle.state.exited && Date.now() < deadline) await delay(100)
  let left = await appPids(handle.executable)
  for (const extra of left) {
    if (process.platform === 'win32') await taskkill(extra)
    else try { process.kill(extra, 'SIGTERM') } catch { /* already gone */ }
  }
  const again = Date.now() + 3000
  while (left.length && Date.now() < again) {
    await delay(100)
    left = await appPids(handle.executable)
  }
  handle.remaining = left
  if (left.length) throw new Error(`App process still running after stop: ${left.join(',')}`)
}

async function walkDiagnostics(dir, found, depth) {
  if (depth > 4 || found.length >= LOG_FILES) return
  let entries = []
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
  for (const entry of entries) {
    if (found.length >= LOG_FILES) return
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walkDiagnostics(full, found, depth + 1)
    else if (isDiagnosticFile(entry.name)) found.push(full)
  }
}

export async function collectDiagnosticTails(dirs) {
  const found = []
  for (const dir of dirs) await walkDiagnostics(dir, found, 0)
  const logs = []
  for (const file of found.slice(0, LOG_FILES)) {
    const data = await readFile(file)
    const slice = data.subarray(Math.max(0, data.length - LOG_BYTES))
    const binary = slice.includes(0)
    logs.push({
      name: path.basename(file),
      bytes: data.length,
      encoding: binary ? 'base64' : 'utf8',
      tail: binary ? slice.toString('base64') : slice.toString('utf8'),
    })
  }
  return logs
}
