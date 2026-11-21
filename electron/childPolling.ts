import type { ChildPollingLimits } from '../src/shared/appConfig'

interface ChildPollingDependencies {
  limits: ChildPollingLimits
  hasLiveSessions: () => boolean
  readParents: (signal: AbortSignal) => Promise<Set<number>>
  onSnapshot: (parents: Set<number> | null, unavailable: boolean) => void
  onError: (error: unknown) => void
}

/** One machine-wide snapshot at a time; opening sessions never bypasses a deadline. */
export class ChildProcessPoller {
  private timer: NodeJS.Timeout | null = null
  private controller: AbortController | null = null
  private disposed = false
  private nextAttemptAt = 0
  private failures = 0
  private retryDelay = 0

  constructor(private deps: ChildPollingDependencies) {}

  /** Call when the set of live sessions changes. No sessions means no timer or query. */
  sync(): void {
    if (this.disposed) return
    if (!this.deps.hasLiveSessions()) {
      this.clearTimer()
      this.controller?.abort()
      return
    }
    if (this.controller || this.timer) return
    const delay = Math.max(0, this.nextAttemptAt - performance.now())
    if (delay === 0) void this.poll()
    else this.timer = setTimeout(() => {
      this.timer = null
      this.sync()
    }, delay)
  }

  dispose(): void {
    this.disposed = true
    this.clearTimer()
    this.controller?.abort()
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private async poll(): Promise<void> {
    const controller = new AbortController()
    this.controller = controller
    // An aborted request must not let a close/reopen burst bypass the normal interval.
    this.nextAttemptAt = performance.now() + this.deps.limits.intervalMs
    try {
      const parents = await this.deps.readParents(controller.signal)
      if (this.disposed || controller.signal.aborted) return
      this.failures = 0
      this.retryDelay = 0
      this.nextAttemptAt = performance.now() + this.deps.limits.intervalMs
      this.deps.onSnapshot(parents, false)
    } catch (error) {
      if (this.disposed || controller.signal.aborted) return
      const limits = this.deps.limits
      this.failures = Math.min(limits.unavailableAfter, this.failures + 1)
      this.retryDelay = this.retryDelay === 0
        ? limits.initialBackoffMs
        : Math.min(limits.maxBackoffMs, this.retryDelay * 2)
      this.nextAttemptAt = performance.now() + Math.max(limits.intervalMs, this.retryDelay)
      this.deps.onError(error)
      this.deps.onSnapshot(null, this.failures >= limits.unavailableAfter)
    } finally {
      this.controller = null
      this.sync()
    }
  }
}
