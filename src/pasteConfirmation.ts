export interface PasteConfirmationAccess {
  canStart: () => boolean
  revision: () => number
  request: (sessionId: string) => Promise<boolean>
}

/** One decision at a time; no clipboard text is stored in the UI request. */
export class PasteConfirmationController implements PasteConfirmationAccess {
  private pending: { sessionId: string; resolve: (accepted: boolean) => void } | null = null
  private generation = 0

  constructor(
    private onChange: (sessionId: string | null) => void,
    private allowed: () => boolean = () => true,
  ) {}

  canStart(): boolean { return this.pending === null && this.allowed() }
  isPending(): boolean { return this.pending !== null }
  revision(): number { return this.generation }

  request(sessionId: string): Promise<boolean> {
    if (!sessionId || !this.canStart()) return Promise.resolve(false)
    this.generation += 1
    return new Promise(resolve => {
      this.pending = { sessionId, resolve }
      this.onChange(sessionId)
    })
  }

  resolve(accepted: boolean): void {
    const pending = this.pending
    if (!pending) return
    this.pending = null
    this.generation += 1
    this.onChange(null)
    pending.resolve(accepted && this.allowed())
  }

  cancel(): void {
    if (this.pending) this.resolve(false)
    else this.generation += 1 // Retire clipboard reads started before another dialog/unmount.
  }
}
