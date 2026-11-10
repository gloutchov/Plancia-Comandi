import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { ShellChoice } from '../src/shared/types'

function canRun(file: string): boolean {
  try {
    fs.accessSync(file, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

function pushUnique(list: ShellChoice[], shell: ShellChoice): void {
  if (list.some((item) => item.id === shell.id)) return
  list.push(shell)
}

function detectUnix(): ShellChoice[] {
  const fallback = process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash'
  const login = process.env.SHELL && canRun(process.env.SHELL) ? process.env.SHELL : fallback
  const shells: ShellChoice[] = [{ id: 'login', command: login, args: ['-l'], labelKey: 'shellLogin' }]
  const known: Array<[string, string, string]> = [
    ['/bin/zsh', 'zsh', 'shellZsh'],
    ['/usr/bin/zsh', 'zsh', 'shellZsh'],
    ['/bin/bash', 'bash', 'shellBash'],
    ['/usr/bin/bash', 'bash', 'shellBash'],
    ['/opt/homebrew/bin/fish', 'fish', 'shellFish'],
    ['/usr/local/bin/fish', 'fish', 'shellFish'],
    ['/bin/fish', 'fish', 'shellFish'],
    ['/usr/bin/fish', 'fish', 'shellFish'],
  ]
  for (const [command, id, labelKey] of known) {
    if (!canRun(command)) continue
    pushUnique(shells, { id, command, args: ['-l'], labelKey })
  }
  return shells
}

function where(command: string): string | null {
  try {
    const output = execFileSync('where.exe', [command], { encoding: 'utf8', windowsHide: true, timeout: 3000 })
    const first = output.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
    return first || null
  } catch {
    return null
  }
}

function detectWindows(): ShellChoice[] {
  const shells: ShellChoice[] = []
  const pwsh = where('pwsh.exe') ?? where('pwsh')
  if (pwsh) pushUnique(shells, { id: 'pwsh', command: pwsh, args: ['-NoLogo'], labelKey: 'shellPwsh' })

  const powershell =
    where('powershell.exe') ??
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  pushUnique(shells, { id: 'powershell', command: powershell, args: ['-NoLogo'], labelKey: 'shellPowershell' })

  const cmd = where('cmd.exe') ?? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
  pushUnique(shells, { id: 'cmd', command: cmd, args: [], labelKey: 'shellCmd' })

  const gitCandidates = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Git', 'bin', 'bash.exe'),
  ]
  const git = gitCandidates.find((candidate) => canRun(candidate))
  if (git) pushUnique(shells, { id: 'gitbash', command: git, args: ['--login', '-i'], labelKey: 'shellGitBash' })
  return shells
}

export function detectShells(): ShellChoice[] {
  const shells = process.platform === 'win32' ? detectWindows() : detectUnix()
  return shells.length > 0 ? shells : [{ id: 'login', command: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash', args: process.platform === 'win32' ? ['-NoLogo'] : ['-l'], labelKey: process.platform === 'win32' ? 'shellPowershell' : 'shellLogin' }]
}

export function defaultShellId(shells: ShellChoice[]): string {
  if (process.platform === 'win32') {
    return shells.find((shell) => shell.id === 'powershell')?.id ?? shells[0]?.id ?? 'powershell'
  }
  return shells.find((shell) => shell.id === 'login')?.id ?? shells[0]?.id ?? 'login'
}
