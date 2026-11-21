import { execFile, type ExecFileOptions } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { listActiveParents } from '../../electron/children'

vi.mock('node:child_process', () => ({ execFile: vi.fn() }))
const run = vi.mocked(execFile)
function output(text: string, error: Error | null = null) {
  run.mockImplementation(((...args: unknown[]) => {
    const callback = args[3] as (error: Error | null, stdout: string) => void
    callback(error, text)
    return {}
  }) as typeof execFile)
}
afterEach(() => { vi.restoreAllMocks(); run.mockReset() })

describe('process snapshot adapter', () => {
  it('uses a static terminating-error command and forwards cancellation on Windows', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32')
    output('0\r\n42\r\n7\r\n42\r\n')
    const controller = new AbortController()
    expect(await listActiveParents(controller.signal)).toEqual(new Set([42, 7]))
    const [command, args, options] = run.mock.calls[0] as unknown as [string, string[], ExecFileOptions]
    expect(command).toBe('powershell.exe')
    expect(args).toEqual(['-NoProfile', '-NonInteractive', '-Command', '$ErrorActionPreference = "Stop"; Get-CimInstance Win32_Process -Property ParentProcessId -ErrorAction Stop | ForEach-Object { "$($_.ParentProcessId)" }'])
    expect(options).toMatchObject({ signal: controller.signal, timeout: 8000, windowsHide: true, maxBuffer: 4_000_000 })
  })

  it.each(['', '  \r\n', '42\nSYNTHETIC_ERROR', '-1', '9007199254740992'])('does not misreport an invalid Windows snapshot as success (%j)', async text => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32')
    output(text)
    await expect(listActiveParents()).rejects.toThrow(/process snapshot/)
  })

  it('propagates command failure rather than treating it as an empty parent set', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32')
    output('', new Error('synthetic access denied'))
    await expect(listActiveParents()).rejects.toThrow('synthetic access denied')
  })

  it('keeps the POSIX snapshot format, ignores zombies and forwards cancellation', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
    output('10 42 S\n11 7 Z+\n12 42 S+\n13 9 R\n')
    const controller = new AbortController()
    expect(await listActiveParents(controller.signal)).toEqual(new Set([42, 9]))
    const [command, args, options] = run.mock.calls[0] as unknown as [string, string[], ExecFileOptions]
    expect(command).toBe('ps')
    expect(args).toEqual(['-ax', '-o', 'pid=,ppid=,stat='])
    expect(options).toMatchObject({ signal: controller.signal, timeout: 4000 })
  })
})
