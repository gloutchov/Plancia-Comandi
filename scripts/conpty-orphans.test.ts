import { describe, expect, it } from 'vitest'
import {
  conptyChildCommand,
  conptyCloseReport,
  descendantNamed,
  mainRejectedFuseClose,
  packagedListenerPid,
  parseProcessTable,
  planciaInstanceReport,
} from './conpty-orphans.mjs'

describe('ConPTY close on the Windows package', () => {
  it('starts a long-running child and records its pid', () => {
    const command = conptyChildCommand()
    expect(command).toBe('start /b ping.exe -n 90 127.0.0.1\r')
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
  })

  it('flags an unhandled rejection or a fuse fork failure in the main log', () => {
    expect(mainRejectedFuseClose('preload ready')).toBe(false)
    expect(mainRejectedFuseClose('UnhandledPromiseRejectionWarning: fork failed')).toBe(true)
    expect(mainRejectedFuseClose('The fuse runAsNode is disabled')).toBe(true)
  })
})