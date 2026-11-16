import { execFile } from 'node:child_process'

// cmd echoes the typed line. A marker inside the command is visible before
// the child exists, so the child is found from the process list instead.
// -n 90 is longer than the 30s search plus the 15s close wait, so ping is still
// the same process when the session closes. start /b keeps it in cmd's console.
export function conptyChildCommand() {
  return 'start /b ping.exe -n 90 127.0.0.1\r'
}

export function parseProcessTable(text) {
  const rows = []
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^\s*(\d+)\s+(\d+)(?:\s+(\S+))?(?:\s+(\d+))?\s*$/.exec(line)
    if (!match) continue
    const row = { pid: Number(match[1]), ppid: Number(match[2]) }
    if (match[3]) row.name = match[3]
    if (match[4]) row.created = match[4]
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

function sameProcess(row, expected) {
  if (typeof expected === 'number') return row.pid === expected
  if (row.pid !== expected.pid) return false
  return !expected.created || row.created === expected.created
}

export function conptyCloseReport(rows, shellPid, childPid) {
  const shellId = typeof shellPid === 'number' ? shellPid : shellPid.pid
  const shellAlive = rows.some(row => sameProcess(row, shellPid))
  const childAlive = rows.some(row => sameProcess(row, childPid))
  const childrenOfShell = rows.filter(row => row.ppid === shellId).map(row => row.pid)
  return {
    clear: !shellAlive && !childAlive && childrenOfShell.length === 0,
    shellAlive,
    childAlive,
    childrenOfShell,
  }
}

export function planciaInstanceReport(rows, ownPid) {
  const named = rows.filter(row => /plancia-comandi\.exe$/i.test(row.name || ''))
  return {
    count: named.length,
    ownPid,
    extra: named.filter(row => row.pid !== ownPid).map(row => row.pid),
  }
}

/** Pid of the extracted app. The portable wrapper's own pid is not a listener owner. */
export function packagedListenerPid(rows, wrapperPid) {
  const name = (row) => /plancia-comandi\.exe$/i.test(row.name || '')
  const children = new Map()
  for (const row of rows) {
    const list = children.get(row.ppid) || []
    list.push(row)
    children.set(row.ppid, list)
  }
  const under = []
  const queue = [...(children.get(wrapperPid) || [])]
  const seen = new Set()
  while (queue.length) {
    const row = queue.shift()
    if (!row || seen.has(row.pid)) continue
    seen.add(row.pid)
    if (name(row)) under.push(row.pid)
    queue.push(...(children.get(row.pid) || []))
  }
  if (under.length === 1) return under[0]
  const named = rows.filter(name).map(row => row.pid)
  if (under.length === 0 && named.length === 1) return named[0]
  return null
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
      "Get-CimInstance Win32_Process | ForEach-Object { '{0} {1} {2} {3}' -f $_.ProcessId, $_.ParentProcessId, $_.Name, $_.CreationDate.ToFileTime() }",
    ], { windowsHide: true, timeout: 15000, maxBuffer: 4_000_000 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(String(stdout))
    })
  })
}
