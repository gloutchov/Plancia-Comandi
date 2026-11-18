import { describe, expect, it } from 'vitest'
import {
  conptyChildCommand,
  conptyCloseReport,
  descendantNamed,
  mainRejectedFuseClose,
  packagedListenerPid,
  packagedListenerPids,
  parseProcessTable,
  parseThreadCount,
  planciaInstanceReport,
  settleThreadCount,
  startupFaultEvents,
  threadCountWithinTolerance,
} from './conpty-orphans.mjs'

describe('ConPTY close on the Windows package', () => {
  it('starts a long-running child and records its pid', () => {
    const command = conptyChildCommand()
    expect(command).toBe('start /b ping.exe -t 127.0.0.1\r')
    expect(command).not.toContain('PLANCIA_CHILD_OK')
  })

  it('finds a ping descendant of the shell', () => {
    const rows = parseProcessTable('10 1 cmd.exe 100\n21 10 ping.exe 200\n30 1 other.exe 300\n')
    expect(descendantNamed(rows, 10, /ping/i)).toEqual({ pid: 21, ppid: 10, name: 'ping.exe', created: '200' })
    expect(descendantNamed(rows, 99, /ping/i)).toBeNull()
  })

  it('treats a closed shell and its child as clear, and an orphan as not', () => {
    const rows = parseProcessTable('10 1\n20 10\n30 1\n\nnot a row\n')
    expect(rows).toEqual([
      { pid: 10, ppid: 1 },
      { pid: 20, ppid: 10 },
      { pid: 30, ppid: 1 },
    ])
    expect(conptyCloseReport(rows, 10, 20).clear).toBe(false)
    expect(conptyCloseReport([{ pid: 30, ppid: 1 }], 10, 20)).toEqual({
      clear: true,
      shellAlive: false,
      childAlive: false,
      childrenOfShell: [],
    })
    expect(conptyCloseReport([{ pid: 40, ppid: 10 }], 10, 20).childrenOfShell).toEqual([40])
  })

  it('counts plancia-comandi instances and finds the extracted portable process', () => {
    const rows = parseProcessTable('5 1 portable.exe 1\n9 5 plancia-comandi.exe 2\n21 9 ping.exe 3\n')
    expect(planciaInstanceReport(rows, 9)).toEqual({ count: 1, ownPid: 9, extra: [] })
    expect(planciaInstanceReport(parseProcessTable('9 1 plancia-comandi.exe 2\n40 1 plancia-comandi.exe 4\n'), 9).extra).toEqual([40])
    expect(packagedListenerPid(rows, 5)).toBe(9)
    expect(packagedListenerPid(parseProcessTable('9 1 plancia-comandi.exe 2\n'), 5)).toBe(9)
    expect(packagedListenerPid(parseProcessTable('9 1 plancia-comandi.exe 2\n40 1 plancia-comandi.exe 4\n'), 5)).toBeNull()
    const launched = [
      '5 1 portable.exe 1\tportable.exe',
      '9 5 plancia-comandi.exe 2\tC:\\app\\plancia-comandi.exe',
      '11 9 plancia-comandi.exe 3\tC:\\app\\plancia-comandi.exe --type=renderer',
      '12 9 plancia-comandi.exe 4\tC:\\app\\plancia-comandi.exe --type=gpu-process',
      '40 9 plancia-comandi.exe 5\tC:\\app\\plancia-comandi.exe --user-data-dir=C:\\tmp',
    ].join('\n')
    const tree = parseProcessTable(launched)
    expect(planciaInstanceReport(tree, 9)).toEqual({ count: 2, ownPid: 9, extra: [40] })
    expect(packagedListenerPid(tree, 5)).toBe(9)
    expect(packagedListenerPids(tree, 5)).toEqual([9, 11, 12, 40])
  })

  it('flags an unhandled rejection or a fuse fork failure in the main log', () => {
    expect(mainRejectedFuseClose('preload ready')).toBe(false)
    expect(mainRejectedFuseClose('UnhandledPromiseRejectionWarning: fork failed')).toBe(true)
    expect(mainRejectedFuseClose('The fuse runAsNode is disabled')).toBe(true)
  })

  it('preserves preexisting apps while still detecting a new instance or a reused pid', () => {
    const before = [{ pid: 40, created: '100' }]
    const rows = parseProcessTable('9 1 plancia-comandi.exe 200\n40 1 plancia-comandi.exe 100\n50 9 plancia-comandi.exe 300\n')
    expect(planciaInstanceReport(rows, 9, before)).toEqual({ count: 2, ownPid: 9, extra: [50] })
    const reused = parseProcessTable('9 1 plancia-comandi.exe 200\n40 1 plancia-comandi.exe 400\n')
    expect(planciaInstanceReport(reused, 9, before).extra).toEqual([40])
    expect(planciaInstanceReport(rows, 9, [{ pid: 40 }]).extra).toEqual([40, 50])
  })

  it('reads a Windows thread count and allows only a small rise', async () => {
    expect(parseThreadCount('  14\r\n')).toBe(14)
    expect(parseThreadCount('unavailable')).toBeNull()
    expect(threadCountWithinTolerance(10, 12)).toBe(true)
    expect(threadCountWithinTolerance(10, 13)).toBe(false)
    const reads = [12, 11, 10]
    const waits = []
    const settled = await settleThreadCount(8, async () => reads.shift(), async (ms) => { waits.push(ms) }, { budgetMs: 5000, intervalMs: 500 })
    expect(settled).toMatchObject({ ok: true, before: 8, after: 10, last: 10, min: 10 })
    expect(waits).toEqual([500, 500])
    const stuck = await settleThreadCount(1, async () => 20, async () => {}, { budgetMs: 0, intervalMs: 500 })
    expect(stuck).toMatchObject({ ok: false, last: 20, min: 20 })
  })

  it('prints the cleaned startup fault when the fork check matches', () => {
    const line = JSON.stringify({ event: 'unhandledRejection', name: 'Error', message: 'spawn <home> ENOENT', code: 'ENOENT' })
    expect(startupFaultEvents(`ready\n${line}\n`)).toEqual([JSON.parse(line)])
    expect(startupFaultEvents('Cannot fork')).toEqual([])
  })
})
