import type { TerminalChunk, TerminalSnapshot } from './shared/types'

/** One ordered stream per terminal. Keep live output behind the snapshot until it is parsed. */
export class TerminalStream {
  private ready = false
  private disposed = false
  private seq = 0
  private queue: TerminalChunk[] = []

  constructor(private terminal: { write: (data: string, callback?: () => void) => void }) {}

  push(chunk: TerminalChunk): void {
    if (this.disposed) return
    if (!this.ready) {
      this.queue.push(chunk)
      return
    }
    if (chunk.seq <= this.seq) return
    this.seq = chunk.seq
    this.terminal.write(chunk.data)
  }

  restore(snapshot: TerminalSnapshot, onReady: () => void): void {
    if (this.disposed) return
    this.seq = snapshot.seq
    this.terminal.write(snapshot.data, () => {
      if (this.disposed) return
      this.ready = true
      for (const chunk of this.queue) this.push(chunk)
      this.queue.length = 0
      onReady()
    })
  }

  dispose(): void {
    this.disposed = true
    this.queue.length = 0
  }
}
