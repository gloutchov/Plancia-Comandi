import { execFile } from 'node:child_process'
import { APP_CONFIG_DEFAULTS, type ProcessSnapshotLimits } from '../src/shared/appConfig'

function run(command: string, args: string[], timeout: number, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout, signal, windowsHide: true, maxBuffer: 4_000_000 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(String(stdout))
    })
  })
}

/**
 * Parent process ids that currently have at least one live child.
 * Zombies are ignored. One snapshot covers every session.
 */
export async function listActiveParents(signal?: AbortSignal, limits: ProcessSnapshotLimits = APP_CONFIG_DEFAULTS.processSnapshot): Promise<Set<number>> {
  if (process.platform === 'win32') return listWindowsParents(signal, limits.windowsTimeoutMs)
  return listUnixParents(signal, limits.unixTimeoutMs)
}

async function listUnixParents(signal: AbortSignal | undefined, timeoutMs: number): Promise<Set<number>> {
  const stdout = await run('ps', ['-ax', '-o', 'pid=,ppid=,stat='], timeoutMs, signal)
  const parents = new Set<number>()
  for (const line of stdout.split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 3) continue
    const ppid = Number(parts[1])
    const stat = parts[2] ?? ''
    if (!ppid || stat.startsWith('Z')) continue
    parents.add(ppid)
  }
  return parents
}

async function listWindowsParents(signal: AbortSignal | undefined, timeoutMs: number): Promise<Set<number>> {
  const stdout = await run(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '$ErrorActionPreference = "Stop"; Get-CimInstance Win32_Process -Property ParentProcessId -ErrorAction Stop | ForEach-Object { "$($_.ParentProcessId)" }',
    ],
    timeoutMs,
    signal,
  )
  const parents = new Set<number>()
  let rows = 0
  for (const line of stdout.split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error('Invalid process snapshot')
    rows += 1
    const ppid = Number(text)
    if (ppid) parents.add(ppid)
  }
  if (rows === 0) throw new Error('Empty process snapshot')
  return parents
}
