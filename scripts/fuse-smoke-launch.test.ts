import { EventEmitter } from 'node:events'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({ execFile: vi.fn(), spawn: vi.fn() }))
vi.mock('node:child_process', () => mocked)
beforeEach(() => { vi.resetModules(); vi.resetAllMocks() })

describe('scoped fuse-probe process cleanup', () => {
  it('preserves preexisting instances and other paths, including names with spaces', async () => {
    const executable = path.resolve('Probe With Spaces', process.platform === 'win32' ? 'Plancia Comandi.exe' : 'Plancia Comandi')
    let rows = [{ pid: 101, executable }, { pid: 303, executable: executable.replace('Probe With Spaces', 'Other Probe') }]
    mocked.execFile.mockImplementation((_command, args, _options, callback) => {
      if (process.platform === 'win32') {
        expect(args.at(-1)).toContain(`$_.ExecutablePath -eq '${executable.replaceAll("'", "''")}'`)
        callback(null, rows.filter(row => row.executable === executable).map(row => row.pid).join('\n'), '')
      } else callback(null, rows.map(row => `${row.pid} ${row.executable} --user-data-dir=synthetic`).join('\n'), '')
    })
    const killed: number[] = []
    const remove = (pid: number) => { killed.push(pid); rows = rows.filter(row => row.pid !== pid) }
    const kill = vi.spyOn(process, 'kill').mockImplementation((pid: number) => { remove(pid); return true })
    mocked.spawn.mockImplementation((_command, args) => {
      const child = new EventEmitter()
      queueMicrotask(() => { remove(Number(args[1])); child.emit('exit', 0) })
      return child
    })
    try {
      const { reapAppImages } = await import('./fuse-smoke-launch.mjs')
      expect(await reapAppImages(executable)).toMatchObject({ before: [], after: [], preserved: [101] })
      rows.push({ pid: 202, executable })
      expect(await reapAppImages(executable)).toMatchObject({ before: [202], after: [], preserved: [101] })
      expect(killed).toEqual([202])
      expect(rows.map(row => row.pid)).toEqual([101, 303])
    } finally { kill.mockRestore() }
  })

  it('rejects unscoped relative executable paths before inspecting or killing processes', async () => {
    const { reapAppImages } = await import('./fuse-smoke-launch.mjs')
    await expect(reapAppImages('Plancia Comandi')).rejects.toThrow(/absolute probe executable/)
    expect(mocked.execFile).not.toHaveBeenCalled()
    expect(mocked.spawn).not.toHaveBeenCalled()
  })
})
