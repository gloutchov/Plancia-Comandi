import { Worker } from 'node:worker_threads'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CustomPatternMatcher } from '../../electron/customPatterns'
import { CUSTOM_PATTERN_WORKER_SOURCE } from '../../electron/customPatternWorker'
import { APP_CONFIG_DEFAULTS } from './appConfig'
import { clampStatusConfig } from './status'

const limits = { ...APP_CONFIG_DEFAULTS.statusPatterns, startupTimeoutMs: 5000 }
const matchers: CustomPatternMatcher[] = []
function matcher(onUpdate = () => {}, createWorker?: () => Worker, capacity = 12) {
  const value = new CustomPatternMatcher(limits, capacity, onUpdate, createWorker)
  matchers.push(value)
  return value
}
function worker() {
  return new Worker(CUSTOM_PATTERN_WORKER_SOURCE, {
    eval: true, env: {}, execArgv: [], workerData: { maxInputChars: limits.maxInputChars },
  })
}
const poll = { timeout: 5000, interval: 10 }
afterEach(async () => { await Promise.all(matchers.splice(0).map((value) => value.dispose())) })

describe('custom pattern worker', () => {
  it('preserves JavaScript regex features, ignores invalid syntax, and reports it without the source', async () => {
    const value = matcher()
    value.setPatterns(clampStatusConfig({ extraIdlePatterns: ['[', '^ready>'], extraBusyPatterns: ['^(foo)\\1$'], extraAttentionPatterns: ['(?=CONFIRM)CONFIRM'] }))
    await expect.poll(() => value.evaluate('one', 'READY>').matches.idle, poll).toBe(true)
    expect(value.evaluate('one', 'READY>').warning).toBe('invalid')
    await expect.poll(() => value.evaluate('two', 'foofoo').matches.busy, poll).toBe(true)
    await expect.poll(() => value.evaluate('three', 'confirm').matches.attention, poll).toBe(true)
    expect(JSON.stringify(value.evaluate('one', 'READY>'))).not.toContain('^ready>')
  })

  it('terminates the actual pathological regex while the main event loop remains responsive', async () => {
    let heartbeats = 0
    const heartbeat = setInterval(() => heartbeats++, 5)
    const created: Worker[] = []
    const value = matcher(() => {}, () => { const w = worker(); created.push(w); return w })
    const pathological = clampStatusConfig({ extraBusyPatterns: ['(a+)+$'] })
    value.setPatterns(pathological)
    try {
      // 31-character pathological regression input, always evaluated off main.
      await expect.poll(() => value.evaluate('one', 'a'.repeat(30) + '!').warning, poll).toBe('timeout')
      expect(heartbeats).toBeGreaterThan(1)
      expect(value.evaluate('two', 'Working').matches).toEqual({ idle: false, busy: false, attention: false })
      value.setPatterns({ ...pathological, quietTimeoutMs: 1000 })
      expect(value.evaluate('one', 'another screen').warning).toBe('timeout')
      expect(created).toHaveLength(1)
      value.setPatterns(clampStatusConfig({ extraBusyPatterns: ['^safe$'] }))
      await expect.poll(() => value.evaluate('one', 'safe').matches.busy, poll).toBe(true)
      expect(value.evaluate('one', 'safe').warning).toBeUndefined()
    } finally { clearInterval(heartbeat) }
  })

  it('bounds pattern counts and text length, including a very long screen', async () => {
    const updated = vi.fn()
    const value = matcher(updated)
    value.setPatterns(clampStatusConfig({
      extraBusyPatterns: [...Array.from({ length: 39 }, (_, index) => `never-${index}`), 'end$', '^PREFIX', 'x'.repeat(300)],
    }))
    await expect.poll(() => value.evaluate('one', 'x'.repeat(100_000) + 'end').matches.busy, poll).toBe(true)
    value.evaluate('two', 'PREFIX' + 'x'.repeat(100_000))
    await expect.poll(() => updated.mock.calls.length, poll).toBe(2)
    expect(value.evaluate('two', 'PREFIX' + 'x'.repeat(100_000)).matches.busy).toBe(false)
  })

  it('coalesces rapid screen changes, bounds session queues and caches completed screens', async () => {
    const posted: unknown[] = []
    const updated = vi.fn()
    const value = matcher(updated, () => {
      const w = worker(), post = w.postMessage.bind(w)
      w.postMessage = (message) => { posted.push(message); post(message) }
      return w
    }, 2)
    value.setPatterns(clampStatusConfig({ extraIdlePatterns: ['^ready>$'] }))
    for (let i = 0; i < 1000; i++) value.evaluate('one', `old-${i}`)
    value.evaluate('one', 'ready>')
    value.evaluate('two', 'ready>')
    expect(value.evaluate('overflow', 'ready>').warning).toBe('unavailable')
    await expect.poll(() => value.evaluate('two', 'ready>').matches.idle, poll).toBe(true)
    expect(value.evaluate('one', 'ready>').matches.idle).toBe(true)
    for (let i = 0; i < 100; i++) value.evaluate('one', 'ready>')
    expect(posted).toHaveLength(2)
    expect(updated).toHaveBeenCalledTimes(2)
  })

  it('discards a result for a superseded screen', async () => {
    let ready!: () => void
    const started = new Promise<void>((resolve) => { ready = resolve })
    const updated = vi.fn()
    const value = matcher(updated, () => {
      const w = worker(); w.once('message', ready); return w
    })
    value.setPatterns(clampStatusConfig({ extraIdlePatterns: ['^OLD$'] }))
    value.evaluate('one', 'OLD')
    await started
    expect(value.evaluate('one', 'NEW').matches.idle).toBe(false)
    await expect.poll(() => updated.mock.calls.length, poll).toBe(2)
    expect(value.evaluate('one', 'NEW').matches.idle).toBe(false)
  })

  it('cancels an active pathological match on close, reopens, and never overlaps workers', async () => {
    const workers: Worker[] = []
    let alive = 0, peak = 0
    let ready!: () => void
    const started = new Promise<void>((resolve) => { ready = resolve })
    const value = matcher(() => {}, () => {
      const w = worker(); workers.push(w); peak = Math.max(peak, ++alive)
      w.on('exit', () => alive--)
      w.once('message', ready)
      return w
    })
    value.setPatterns(clampStatusConfig({ extraBusyPatterns: ['(a+)+$'] }))
    value.evaluate('closed', 'a'.repeat(30) + '!')
    await started
    value.cancel('closed')
    await expect.poll(() => value.evaluate('reopened', 'aaaa').matches.busy, poll).toBe(true)
    expect(value.evaluate('reopened', 'aaaa').warning).toBeUndefined()
    await value.dispose()
    expect(peak).toBe(1)
    expect(alive).toBe(0)
    expect(workers.every((w) => w.threadId === -1)).toBe(true)
    expect(value.evaluate('after-dispose', 'aaaa').matches.busy).toBe(false)
  })

  it('falls back on worker creation failure or crash without exposing error details', async () => {
    const unavailable = matcher(() => {}, () => { throw new Error('PRIVATE_PATH_AND_SECRET') })
    unavailable.setPatterns(clampStatusConfig({ extraIdlePatterns: ['ready'] }))
    expect(unavailable.evaluate('one', 'ready')).toEqual({ matches: { idle: false, busy: false, attention: false }, warning: 'unavailable' })
    const crashed = matcher(() => {}, () => new Worker("throw new Error('PRIVATE_PATH_AND_SECRET')", { eval: true, env: {}, execArgv: [] }))
    crashed.setPatterns(clampStatusConfig({ extraIdlePatterns: ['ready'] }))
    await expect.poll(() => crashed.evaluate('one', 'ready').warning, poll).toBe('unavailable')
    expect(JSON.stringify(crashed.evaluate('one', 'ready'))).not.toContain('PRIVATE')
  })

  it('releases an idle worker when all sessions close and skips workers with default patterns', async () => {
    const created: Worker[] = []
    const value = matcher(() => {}, () => { const w = worker(); created.push(w); return w })
    value.setPatterns(clampStatusConfig(null))
    expect(value.evaluate('one', 'ready').warning).toBeUndefined()
    expect(created).toHaveLength(0)
    value.setPatterns(clampStatusConfig({ extraIdlePatterns: ['ready'] }))
    await expect.poll(() => value.evaluate('one', 'ready').matches.idle, poll).toBe(true)
    value.cancel('one')
    await expect.poll(() => created[0].threadId, poll).toBe(-1)
  })

  it('bounds worker startup and rejects malformed worker replies', async () => {
    const stalled = new CustomPatternMatcher(
      { ...limits, startupTimeoutMs: 500 }, 12, () => {},
      () => new Worker('setInterval(() => {}, 1000)', { eval: true, env: {}, execArgv: [] }),
    )
    matchers.push(stalled)
    stalled.setPatterns(clampStatusConfig({ extraIdlePatterns: ['ready'] }))
    await expect.poll(() => stalled.evaluate('one', 'ready').warning, poll).toBe('unavailable')
    const malformed = matcher(() => {}, () => new Worker("require('node:worker_threads').parentPort.postMessage({ type: 'result', matches: 'not a boolean record' })", { eval: true, env: {}, execArgv: [] }))
    malformed.setPatterns(clampStatusConfig({ extraIdlePatterns: ['ready'] }))
    await expect.poll(() => malformed.evaluate('one', 'ready').warning, poll).toBe('unavailable')
  })
})
