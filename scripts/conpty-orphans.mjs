import { execFile } from 'node:child_process'

// cmd echoes the typed line. A marker inside the command is visible before
// the child exists, so the child is found from the process list instead.
export function conptyChildCommand() {
  return 'start /b ping.exe -n 60 127.0.0.1\r'
}

export function parseProcessTable(text) {
  const rows = []
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^\s*(\d+)\s+(\d+)(?:\s+(\S+))?\s*$/.exec(line)
    if (!match) continue
    const row = { pid: Number(match[1]), ppid: Number(match[2]) }
    if (match[3]) row.name = match[3]
    rows.push(row)
  }
  return rows
}

export function descendantNamed(rows, rootPid, namePattern) {
  const children = new Map()
  for (const row of rows) {
    const list = children.get(row.ppid) || []
    list.push(row)
    children.set(row.ppid, list)
  }
  const queue = [...(children.get(rootPid) || [])]
  const seen = new Set()
  while (queue.length) {
    const row = queue.shift()
    if (!row || seen.has(row.pid)) continue
    seen.add(row.pid)
    if (namePattern.test(row.name || '')) return row
    queue.push(...(children.get(row.pid) || []))
  }
  return null
}

export function conptyTimeoutDetail({ command, terminal, processes }) {
  return {
    command,
    terminal: String(terminal).slice(-1500),
    processes: String(processes).slice(-1500),
  }
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
      "Get-CimInstance Win32_Process | ForEach-Object { '{0} {1} {2}' -f $_.ProcessId, $_.ParentProcessId, $_.Name }",
    ], { windowsHide: true, timeout: 15000, maxBuffer: 4_000_000 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(String(stdout))
    })
  })
}
