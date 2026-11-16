import { execFile } from 'node:child_process'

export const conptyChildFile = 'conpty-child.txt'

// The shell is cmd. PowerShell starts ping and records its pid in the session cwd.
export function conptyChildCommand() {
  return `powershell.exe -NoProfile -NonInteractive -Command "$p=Start-Process -FilePath ping.exe -ArgumentList '-n','25','127.0.0.1' -WindowStyle Hidden -PassThru; Set-Content -LiteralPath '${conptyChildFile}' -Value $p.Id; Write-Output PLANCIA_CHILD_OK"\r`
}

export function parseProcessTable(text) {
  const rows = []
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^\s*(\d+)\s+(\d+)\s*$/.exec(line)
    if (!match) continue
    rows.push({ pid: Number(match[1]), ppid: Number(match[2]) })
  }
  return rows
}

export function conptyCloseReport(rows, shellPid, childPid) {
  const shellAlive = rows.some(row => row.pid === shellPid)
  const childAlive = rows.some(row => row.pid === childPid)
  const childrenOfShell = rows.filter(row => row.ppid === shellPid).map(row => row.pid)
  return {
    clear: !shellAlive && !childAlive && childrenOfShell.length === 0,
    shellAlive,
    childAlive,
    childrenOfShell,
  }
}

export function mainRejectedFuseClose(diagnostics) {
  return /UnhandledPromiseRejection|unhandledRejection|runAsNode is disabled|Cannot fork/i.test(String(diagnostics))
}

export function windowsProcessTable() {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "Get-CimInstance Win32_Process | ForEach-Object { '{0} {1}' -f $_.ProcessId, $_.ParentProcessId }",
    ], { windowsHide: true, timeout: 15000, maxBuffer: 4_000_000 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(String(stdout))
    })
  })
}
