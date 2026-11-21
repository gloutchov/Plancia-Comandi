import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChildProcessPoller } from '../../electron/childPolling'
import { APP_CONFIG_DEFAULTS } from './appConfig'

let live: boolean
let poller: ChildProcessPoller
const parents = new Set([42])

function setup(readParents = vi.fn(async (_signal: AbortSignal) => parents)) {
  const onSnapshot = vi.fn()
  const onError = vi.fn()
  poller = new ChildProcessPoller({
    limits: APP_CONFIG_DEFAULTS.childPolling,
    hasLiveSessions: () => live,
    readParents, onSnapshot, onError,
  })
  return { readParents, onSnapshot, onError }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(100_000); live = false })
afterEach(() => { poller?.dispose(); vi.useRealTimers() })

describe('shared child process polling', () => {
  it('runs no query or timer during thirty seconds without live sessions', async () => {
    const { readParents } = setup()
    poller.sync()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(readParents).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shares snapshots and never lets session changes bypass the normal deadline', async () => {
    const { readParents, onSnapshot } = setup()
    live = true
    poller.sync()
    await vi.advanceTimersByTimeAsync(0)
    expect(onSnapshot).toHaveBeenLastCalledWith(parents, false)
    for (let i = 0; i < 20; i++) poller.sync()
    await vi.advanceTimersByTimeAsync(2499)
    expect(readParents).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(readParents).toHaveBeenCalledTimes(2)
    live = false
    poller.sync()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(readParents).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('backs off 10, 20, 40, 60, 60 seconds and warns only after the third failure', async () => {
    const read = vi.fn(async (_signal: AbortSignal): Promise<Set<number>> => { throw new Error('synthetic failure') })
    const { onSnapshot, onError } = setup(read)
    live = true
    poller.sync()
    await vi.advanceTimersByTimeAsync(0)
    expect(onSnapshot).toHaveBeenLastCalledWith(null, false)
    for (const [i, wait] of [10_000, 20_000, 40_000, 60_000, 60_000].entries()) {
      // Additional sessions and focus changes cannot force a retry early.
      poller.sync()
      await vi.advanceTimersByTimeAsync(wait - 1)
      expect(read).toHaveBeenCalledTimes(i + 1)
      await vi.advanceTimersByTimeAsync(1)
      expect(read).toHaveBeenCalledTimes(i + 2)
      expect(onSnapshot).toHaveBeenLastCalledWith(null, i + 2 >= 3)
    }
    expect(onError).toHaveBeenCalledTimes(6)
  })

  it('clears the warning and resets the backoff only after a successful snapshot', async () => {
    const read = vi.fn(async (_signal: AbortSignal) => parents)
      .mockRejectedValueOnce(new Error('one'))
      .mockRejectedValueOnce(new Error('two'))
      .mockRejectedValueOnce(new Error('three'))
    const { onSnapshot } = setup(read)
    live = true
    poller.sync()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(onSnapshot).toHaveBeenLastCalledWith(null, true)
    await vi.advanceTimersByTimeAsync(40_000)
    expect(onSnapshot).toHaveBeenLastCalledWith(parents, false)
    read.mockRejectedValueOnce(new Error('new failure'))
    await vi.advanceTimersByTimeAsync(2500)
    expect(onSnapshot).toHaveBeenLastCalledWith(null, false)
    const count = read.mock.calls.length
    await vi.advanceTimersByTimeAsync(9999)
    expect(read).toHaveBeenCalledTimes(count)
    await vi.advanceTimersByTimeAsync(1)
    expect(read).toHaveBeenCalledTimes(count + 1)
  })

  it('does not overlap slow requests and starts the next interval after completion', async () => {
    let resolve!: (value: Set<number>) => void
    const read = vi.fn((_signal: AbortSignal) => new Promise<Set<number>>(done => { resolve = done }))
    const { onSnapshot } = setup(read)
    live = true
    poller.sync()
    await vi.advanceTimersByTimeAsync(8000)
    poller.sync()
    expect(read).toHaveBeenCalledTimes(1)
    resolve(parents)
    await vi.advanceTimersByTimeAsync(2499)
    expect(onSnapshot).toHaveBeenLastCalledWith(parents, false)
    expect(read).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(read).toHaveBeenCalledTimes(2)
  })

  it.each(['empty', 'disposed'])('aborts and ignores late results when %s', async mode => {
    let resolve!: (value: Set<number>) => void
    const read = vi.fn((_signal: AbortSignal) => new Promise<Set<number>>(done => { resolve = done }))
    const { onSnapshot, onError } = setup(read)
    live = true
    poller.sync()
    const signal = read.mock.calls[0][0]
    if (mode === 'empty') { live = false; poller.sync() }
    else poller.dispose()
    expect(signal.aborted).toBe(true)
    resolve(parents)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(onSnapshot).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(read).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps the error deadline across an empty period and reopening', async () => {
    const read = vi.fn(async (_signal: AbortSignal): Promise<Set<number>> => { throw new Error('synthetic') })
    setup(read)
    live = true
    poller.sync()
    await vi.advanceTimersByTimeAsync(1)
    live = false
    poller.sync()
    await vi.advanceTimersByTimeAsync(1000)
    live = true
    poller.sync()
    await vi.advanceTimersByTimeAsync(8998)
    expect(read).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('keeps deadlines when the system clock changes during an empty period', async () => {
    const { readParents } = setup()
    live = true
    poller.sync()
    await vi.advanceTimersByTimeAsync(0)
    live = false
    poller.sync()
    vi.setSystemTime(Date.now() + 3_600_000)
    live = true
    poller.sync()
    await vi.advanceTimersByTimeAsync(2499)
    expect(readParents).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(readParents).toHaveBeenCalledTimes(2)
  })
})
