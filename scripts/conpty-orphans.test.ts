import { describe, expect, it } from 'vitest'
import {
  conptyChildCommand,
  conptyCloseReport,
  mainRejectedFuseClose,
  parseProcessTable,
} from './conpty-orphans.mjs'

describe('ConPTY close on the Windows package', () => {
  it('starts a long-running child and records its pid', () => {
    const command = conptyChildCommand()
    expect(command).toContain('ping.exe')
    expect(command).toContain('PLANCIA_CHILD_OK')
    expect(command).toContain('conpty-child.txt')
    expect(command.endsWith('\r')).toBe(true)
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

  it('flags an unhandled rejection or a fuse fork failure in the main log', () => {
    expect(mainRejectedFuseClose('preload ready')).toBe(false)
    expect(mainRejectedFuseClose('UnhandledPromiseRejectionWarning: fork failed')).toBe(true)
    expect(mainRejectedFuseClose('The fuse runAsNode is disabled')).toBe(true)
  })
})