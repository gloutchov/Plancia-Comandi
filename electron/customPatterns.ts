import { Worker } from 'node:worker_threads'
import type { StatusPatternLimits } from '../src/shared/appConfig'
import { customPatternText } from '../src/shared/customPatternText'
import { clampStatusConfig } from '../src/shared/status'
import type { CustomPatternMatches, CustomPatternWarning, StatusConfig } from '../src/shared/types'
import { CUSTOM_PATTERN_WORKER_SOURCE } from './customPatternWorker'

const NO_MATCHES: CustomPatternMatches = Object.freeze({ idle: false, busy: false, attention: false })
type Sources = Record<keyof CustomPatternMatches, string[]>
type Entry = { key: string; matches: CustomPatternMatches | null }
type Job = { sessionId: string; key: string; text: ReturnType<typeof customPatternText> }

/** One worker, one in-flight job, and at most one latest pending screen per session. */
export class CustomPatternMatcher {
  private worker: Worker | null = null
  private stopping: Promise<void> | null = null
  private ready = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private active: (Job & { id: number }) | null = null
  private pending = new Map<string, Job>()
  private entries = new Map<string, Entry>()
  private patterns: Sources = { idle: [], busy: [], attention: [] }
  private profileKey = ''
  private revision = 0
  private nextId = 0
  private enabled = false
  private invalid = false
  private disabled: CustomPatternWarning | undefined
  private disposed = false

  constructor(
    private limits: StatusPatternLimits,
    private capacity: number,
    private onUpdate: () => void,
    private createWorker: () => Worker = () => new Worker(CUSTOM_PATTERN_WORKER_SOURCE, {
      eval: true,
      env: {},
      execArgv: [],
      stdout: true,
      stderr: true,
      workerData: { maxInputChars: limits.maxInputChars },
      resourceLimits: { maxOldGenerationSizeMb: limits.workerMemoryMb },
    }),
  ) {}

  setPatterns(config: StatusConfig): void {
    if (this.disposed) return
    const safe = clampStatusConfig(config)
    const patterns = { idle: safe.extraIdlePatterns, busy: safe.extraBusyPatterns, attention: safe.extraAttentionPatterns }
    const key = JSON.stringify(patterns)
    if (key === this.profileKey) return
    this.profileKey = key
    this.patterns = patterns
    this.enabled = Object.values(patterns).some((list) => list.length > 0)
    this.revision += 1
    this.disabled = undefined
    this.invalid = false
    this.entries.clear()
    this.pending.clear()
    void this.stopWorker()
  }

  evaluate(sessionId: string, visibleText: string): { matches: CustomPatternMatches; warning?: CustomPatternWarning } {
    if (this.disposed || !this.enabled) return { matches: NO_MATCHES }
    if (this.disabled) return { matches: NO_MATCHES, warning: this.disabled }
    if (!this.entries.has(sessionId) && this.entries.size >= this.capacity) {
      return { matches: NO_MATCHES, warning: 'unavailable' }
    }
    const text = customPatternText(visibleText, this.limits.maxInputChars)
    const key = JSON.stringify(text)
    let entry = this.entries.get(sessionId)
    if (!entry || entry.key !== key) {
      entry = { key, matches: null }
      this.entries.set(sessionId, entry)
      this.pending.set(sessionId, { sessionId, key, text })
    }
    this.pump()
    return { matches: entry.matches ?? NO_MATCHES, warning: this.disabled ?? (this.invalid ? 'invalid' : undefined) }
  }

  cancel(sessionId: string): void {
    this.entries.delete(sessionId)
    this.pending.delete(sessionId)
    if (this.active?.sessionId === sessionId || this.entries.size === 0) void this.stopWorker()
  }

  async dispose(): Promise<void> {
    this.disposed = true
    this.pending.clear()
    this.entries.clear()
    await this.stopWorker()
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private stopWorker(): Promise<void> {
    this.clearTimer()
    this.active = null
    this.ready = false
    if (this.stopping) return this.stopping
    const worker = this.worker
    this.worker = null
    if (!worker) return Promise.resolve()
    this.stopping = worker.terminate().then(() => {}, () => {}).finally(() => {
      this.stopping = null
      this.pump()
    })
    return this.stopping
  }

  private fail(reason: 'timeout' | 'unavailable'): void {
    this.disabled = reason
    this.pending.clear()
    for (const entry of this.entries.values()) entry.matches = null
    void this.stopWorker()
    this.onUpdate()
  }

  private pump(): void {
    if (this.disposed || this.disabled || this.stopping || this.active || this.pending.size === 0) return
    if (!this.worker) {
      let worker: Worker
      try {
        worker = this.createWorker()
      } catch {
        this.fail('unavailable')
        return
      }
      this.worker = worker
      worker.stdout?.resume()
      worker.stderr?.resume()
      worker.on('message', (message: unknown) => {
        if (this.worker === worker) this.receive(message)
      })
      worker.on('error', () => {
        if (this.worker === worker) this.fail('unavailable')
      })
      worker.on('messageerror', () => {
        if (this.worker === worker) this.fail('unavailable')
      })
      worker.on('exit', () => {
        if (this.worker === worker) this.fail('unavailable')
      })
      worker.unref()
      this.timer = setTimeout(() => this.fail('unavailable'), this.limits.startupTimeoutMs)
      return
    }
    if (!this.ready) return
    const job = this.pending.values().next().value as Job
    this.pending.delete(job.sessionId)
    this.active = { ...job, id: ++this.nextId }
    this.timer = setTimeout(() => this.fail('timeout'), this.limits.budgetMs)
    try {
      this.worker.postMessage({ id: this.active.id, revision: this.revision, patterns: this.patterns, text: job.text })
    } catch {
      this.fail('unavailable')
    }
  }

  private receive(message: unknown): void {
    if (!message || typeof message !== 'object') return this.fail('unavailable')
    const reply = message as Record<string, unknown>
    if (reply.type === 'ready' && !this.ready) {
      this.clearTimer()
      this.ready = true
      this.pump()
      return
    }
    const active = this.active
    const matches = reply.matches as CustomPatternMatches | undefined
    if (reply.type !== 'result' || !active || reply.id !== active.id || reply.revision !== this.revision ||
        typeof reply.invalid !== 'boolean' || !matches ||
        !['idle', 'busy', 'attention'].every((key) => typeof matches[key as keyof CustomPatternMatches] === 'boolean')) {
      this.fail('unavailable')
      return
    }
    this.clearTimer()
    this.active = null
    this.invalid = reply.invalid
    const entry = this.entries.get(active.sessionId)
    if (entry?.key === active.key) entry.matches = matches
    this.pump()
    this.onUpdate()
  }
}
