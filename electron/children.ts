import { execFile } from 'node:child_process'

function run(command: string, args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout, windowsHide: true, maxBuffer: 4_000_000 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(String(stdout))
    })
  })
}

/**
 * Parent process ids that currently have at least one live child.
 * Zombies are ignored. One snapshot covers every session.
 */
export async function listActiveParents(): Promise<Set<number>> {
  if (process.platform === 'win32') return listWindowsParents()
  return listUnixParents()
}

async function listUnixParents(): Promise<Set<number>> {
  const stdout = await run('ps', ['-ax', '-o', 'pid=,ppid=,stat='], 4000)
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

async function listWindowsParents(): Promise<Set<number>> {
  const stdout = await run(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ParentProcessId)" }',
    ],
    8000,
  )
  const parents = new Set<number>()
  for (const line of stdout.split(/\r?\n/)) {
    const ppid = Number(line.trim())
    if (ppid) parents.add(ppid)
  }
  return parents
}
