import { describe, expect, it } from 'vitest'
import { closeShellTree, taskkillCommand } from './windowsShellClose'

describe('Windows shell close', () => {
  it('always taskkills the shell tree on win32 and then closes the pty', async () => {
    const calls: string[][] = []
    const killed: string[] = []
    await closeShellTree('win32', 4242, () => { killed.push('pty') }, async (command, args) => {
      calls.push([command, ...args])
    }, 'D:\\Windows')
    expect(calls).toEqual([[taskkillCommand('D:\\Windows', 4242).command, '/PID', '4242', '/T', '/F']])
    expect(taskkillCommand('D:\\Windows', 4242).command).toBe('D:\\Windows\\System32\\taskkill.exe')
    expect(killed).toEqual(['pty'])
  })

  it('still closes the pty when taskkill reports the process is already gone', async () => {
    const killed: string[] = []
    await closeShellTree('win32', 7, () => { killed.push('pty') }, async () => {
      throw new Error('taskkill timeout')
    }, 'C:\\Windows')
    expect(killed).toEqual(['pty'])
  })

  it('does not call taskkill on macOS', async () => {
    let ran = false
    const killed: string[] = []
    await closeShellTree('darwin', 7, () => { killed.push('pty') }, async () => { ran = true })
    expect(ran).toBe(false)
    expect(killed).toEqual(['pty'])
  })
})
