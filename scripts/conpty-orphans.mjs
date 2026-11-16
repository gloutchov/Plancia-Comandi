import { execFile } from 'node:child_process'

// cmd echoes the typed line. A marker inside the command is visible before
// the child exists, so the child is found from the process list instead.
// ping -t does not exit by itself. start /b keeps it in cmd's console, so
// after close that pid and every shell descendant must be gone.
export function conptyChildCommand() {
  return 'start /b ping.exe -t 127.0.0.1\r'
}

export function parseProcessTable(text) {
  const rows = []
  for (const line of String(text).split(/\r?\n/)) {
    const tab = line.indexOf('\t')
    const head = tab === -1 ? line : line.slice(0, tab)
    const command = tab === -1 ? '' : line.slice(tab + 1)
    const match = /^\s*(\d+)\s+(\d+)(?:\s+(\S+))?(?:\s+(\d+))?\s*$/.exec(head)
    if (!match) continue
    const row = { pid: Number(match[1]), ppid: Number(match[2]) }
    if (match[3]) row.name = match[3]
    if (match[4]) row.created = match[4]
    if (command) row.command = command
    rows.push(row)
  }
  return rows
}

function isPlanciaExe(row) {
  return /plancia-comandi\.exe$/i.test(row.name || '')
}

/** Electron helpers share the exe name and carry --type=. A relaunched app does not. */
export function isAppInstance(row) {
  return isPlanciaExe(row) && !/--type=/.test(row.command || '')
}

export function descendantPids(rows, rootPid) {
  const children = new Map()
  for (const row of rows) {
    const list = children.get(row.ppid) || []
    list.push(row)
    children.set(row.ppid, list)
  }
  const found = []
  const queue = [...(children.get(rootPid) || [])]
  const seen = new Set()
  while (queue.length) {
    const row = queue.shift()
    if (!row || seen.has(row.pid)) continue
    seen.add(row.pid)
    found.push(row.pid)
    queue.push(...(children.get(row.pid) || []))
  }
  return found
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
  const apps = rows.filter(isAppInstance)
  return {
    count: apps.length,
    ownPid,
    extra: apps.filter(row => row.pid !== ownPid).map(row => row.pid),
  }
}

function childMap(rows) {
  const children = new Map()
  for (const row of rows) {
    const list = children.get(row.ppid) || []
    list.push(row)
    children.set(row.ppid, list)
  }
  return children
}

function descendants(rows, rootPid) {
  const children = childMap(rows)
  const found = []
  const queue = [...(children.get(rootPid) || [])]
  const seen = new Set()
  while (queue.length) {
    const row = queue.shift()
    if (!row || seen.has(row.pid)) continue
    seen.add(row.pid)
    found.push(row)
    queue.push(...(children.get(row.pid) || []))
  }
  return found
}

/** Pid of the extracted main. Helpers with --type= are not candidates. */
export function packagedListenerPid(rows, wrapperPid) {
  const under = descendants(rows, wrapperPid).filter(isAppInstance)
  const roots = under.filter(row => !under.some(other => other.pid === row.ppid))
  if (roots.length === 1) return roots[0].pid
  if (under.length === 1) return under[0].pid
  const named = rows.filter(isAppInstance)
  if (under.length === 0 && named.length === 1) return named[0].pid
  return null
}

/** Main plus its plancia-comandi.exe helpers. CDP may listen on the browser process. */
export function packagedListenerPids(rows, wrapperPid) {
  const main = packagedListenerPid(rows, wrapperPid)
  if (!main) return []
  const helpers = descendants(rows, main).filter(isPlanciaExe).map(row => row.pid)
  return [main, ...helpers]
}

export function mainRejectedFuseClose(diagnostics) {
  return /UnhandledPromiseRejection|unhandledRejection|runAsNode is disabled|Cannot fork/i.test(String(diagnostics))
}

export function startupFaultEvents(diagnostics) {
  const events = []
  for (const line of String(diagnostics).split(/\r?\n/)) {
    const start = line.indexOf('{')
    if (start < 0) continue
    try {
      const event = JSON.parse(line.slice(start))
      if (event?.event === 'uncaughtException' || event?.event === 'unhandledRejection') events.push(event)
    } catch { /* the line is not a startup trace event */ }
  }
  return events
}

// +2 covers a console helper Windows may still be reaping. A leaked conout worker adds more.
export const MAIN_THREAD_TOLERANCE = 2

export function parseThreadCount(text) {
  const line = String(text).trim().split(/\r?\n/).map((row) => row.trim()).find(Boolean)
  if (!line || !/^\d+$/.test(line)) return null
  return Number(line)
}

export function threadCountWithinTolerance(before, after, tolerance = MAIN_THREAD_TOLERANCE) {
  return Number.isInteger(before) && Number.isInteger(after) && after <= before + tolerance
}

/** Sample until the count is within tolerance, or the budget expires. The first sample is immediate. */
export async function settleThreadCount(before, read, wait, { tolerance = MAIN_THREAD_TOLERANCE, budgetMs = 10000, intervalMs = 500 } = {}) {
  const started = Date.now()
  let last = null
  let min = null
  for (;;) {
    const after = await read()
    if (!Number.isInteger(after)) throw new Error('Main thread count is unavailable')
    last = after
    min = min == null ? after : Math.min(min, after)
    if (threadCountWithinTolerance(before, after, tolerance)) return { before, after, last, min, ok: true }
    if (Date.now() - started >= budgetMs) return { before, after: last, last, min, ok: false }
    await wait(intervalMs)
  }
}

export function windowsThreadCount(pid) {
  const id = Number(pid)
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `(Get-CimInstance Win32_Process -Filter 'ProcessId=${id}').ThreadCount`,
    ], { windowsHide: true, timeout: 15000 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(String(stdout))
    })
  })
}

export function windowsProcessTable() {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "Get-CimInstance Win32_Process | ForEach-Object { \"{0} {1} {2} {3}`t{4}\" -f $_.ProcessId, $_.ParentProcessId, $_.Name, $_.CreationDate.ToFileTime(), $_.CommandLine }",
    ], { windowsHide: true, timeout: 15000, maxBuffer: 4_000_000 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(String(stdout))
    })
  })
}
