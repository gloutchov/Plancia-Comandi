import { Terminal } from '@xterm/headless'
import { describe, expect, it, vi } from 'vitest'
import { TerminalStream } from './terminalStream'

const id = 'synthetic'
const chunk = (seq: number, data: string) => ({ id, seq, data })

describe('terminal snapshot and live stream', () => {
  it('keeps chunks arriving during snapshot parsing in order and skips snapshot duplicates', () => {
    const callbacks: Array<() => void> = []
    const written: string[] = []
    const stream = new TerminalStream({ write: (data, callback) => {
      written.push(data)
      if (callback) callbacks.push(callback)
    } })
    stream.push(chunk(1, 'snapshot'))
    stream.push(chunk(2, 'first'))
    const ready = vi.fn()
    stream.restore({ seq: 1, data: 'snapshot' }, ready)
    stream.push(chunk(3, 'second'))
    expect(written).toEqual(['snapshot'])
    callbacks[0]()
    stream.push(chunk(3, 'duplicate'))
    stream.push(chunk(4, 'third'))
    expect(written).toEqual(['snapshot', 'first', 'second', 'third'])
    expect(ready).toHaveBeenCalledOnce()
  })

  it('preserves a fragmented device query across the snapshot/live boundary and replies once', async () => {
    const terminal = new Terminal({ cols: 80, rows: 24, allowProposedApi: true })
    const replies: string[] = []
    terminal.onData(data => replies.push(data))
    const stream = new TerminalStream(terminal)
    try {
      stream.push(chunk(1, 'READY\x1b['))
      stream.push(chunk(2, 'c\x1b[32mfirst'))
      await new Promise<void>(resolve => {
        stream.restore({ seq: 1, data: 'READY\x1b[' }, resolve)
        stream.push(chunk(3, ' second\x1b[0m'))
      })
      await new Promise<void>(resolve => terminal.write('', resolve))
      expect(replies).toEqual(['\x1b[?1;2c'])
      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('READYfirst second')
    } finally { stream.dispose(); terminal.dispose() }
  })

  it('does not write or call ready after disposal while a snapshot is pending', () => {
    let parsed = () => {}
    const write = vi.fn((_data: string, callback?: () => void) => { if (callback) parsed = callback })
    const stream = new TerminalStream({ write })
    const ready = vi.fn()
    stream.restore({ seq: 1, data: 'snapshot' }, ready)
    stream.push(chunk(2, 'queued'))
    stream.dispose()
    parsed()
    stream.push(chunk(3, 'late'))
    stream.restore({ seq: 3, data: 'late snapshot' }, ready)
    expect(write).toHaveBeenCalledTimes(1)
    expect(ready).not.toHaveBeenCalled()
  })

  it('forwards fresh device queries, Unicode and escape input without filtering', async () => {
    const terminal = new Terminal()
    const input: string[] = []
    terminal.onData(data => input.push(data))
    const stream = new TerminalStream(terminal)
    try {
      await new Promise<void>(resolve => stream.restore({ seq: 0, data: '' }, resolve))
      stream.push(chunk(1, '\x1b[c'))
      stream.push(chunk(2, '\x1b[c'))
      await new Promise<void>(resolve => terminal.write('', resolve))
      terminal.input('è 😀\r\n\x1b[A')
      expect(input).toEqual(['\x1b[?1;2c', '\x1b[?1;2c', 'è 😀\r\n\x1b[A'])
    } finally { stream.dispose(); terminal.dispose() }
  })
})
