import { execFile } from 'node:child_process'
import path from 'node:path'

export const TASKKILL_TIMEOUT_MS = 3000

export type TaskkillRunner = (command: string, args: readonly string[]) => Promise<void>

/** Absolute taskkill.exe. The shell pid is node-pty's IPty.pid, which on Windows is the console process (innerPid). */
export function taskkillCommand(systemRoot: string | undefined, pid: number): { command: string, args: string[] } {
  const root = systemRoot && systemRoot.trim() ? systemRoot.trim().replace(/[\\/]+$/, '') : 'C:\\Windows'
  return {
    command: path.win32.join(root, 'System32', 'taskkill.exe'),
    args: ['/PID', String(pid), '/T', '/F'],
  }
}

export function runTaskkill(command: string, args: readonly string[], timeoutMs = TASKKILL_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: timeoutMs, windowsHide: true }, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

/**
 * On Windows, always end the shell tree with taskkill, then always call pty.kill().
 * taskkill is not a fallback: useConptyDll avoids fork, and taskkill still reaps children.
 * A missing process or a timeout must not skip pty.kill() or leave a rejected promise.
 * Other platforms only call pty.kill().
 */
export async function closeShellTree(platform: string, pid: number | null, killPty: () => void, run: TaskkillRunner, systemRoot?: string): Promise<void> {
  if (platform === 'win32' && Number.isInteger(pid) && (pid ?? 0) > 0) {
    const spec = taskkillCommand(systemRoot, pid as number)
    try {
      await run(spec.command, [...spec.args])
    } catch { /* already exited, or taskkill timed out */ }
  }
  killPty()
}
