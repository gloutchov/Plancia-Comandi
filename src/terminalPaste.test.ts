import type { Terminal } from '@xterm/xterm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PasteConfirmationController } from './pasteConfirmation'
import { createPasteLane, discardPasteGesture, dropIntoTerminal, pasteFocusedTerminal, pasteIntoTerminal, registerTerminalEdit, setFocusedTerminal, type TerminalPasteGuard } from './terminalEdit'

const limits = { maxPasteChars: 30, maxDroppedFiles: 4, maxPathChars: 200 }
let serial = 0
const event = () => ({ role: 'direct' as const, id: `m36-${++serial}` })
function setup(text: string, bracketed = false) {
  const paste = vi.fn()
  const modes = { bracketedPasteMode: bracketed }
  const options = { ignoreBracketedPasteMode: false }
  const term = { paste, modes, options } as unknown as Terminal
  const readClipboardText = vi.fn(async () => text)
  const readClipboardImage = vi.fn(async () => null)
  vi.stubGlobal('window', { plancia: { readClipboardImage, readClipboardText } })
  const changed = vi.fn()
  const controller = new PasteConfirmationController(changed)
  let available = true
  const guard: TerminalPasteGuard = { sessionId: 'owner', isAvailable: () => available, confirmation: controller }
  return { paste, term, modes, options, controller, changed, guard, readClipboardImage, readClipboardText, retire: () => { available = false } }
}
async function pending(controller: PasteConfirmationController) {
  for (let i = 0; i < 10 && !controller.isPending(); i++) await Promise.resolve()
  expect(controller.isPending()).toBe(true)
}
afterEach(() => { vi.unstubAllGlobals(); setFocusedTerminal(null) })

describe('guarded terminal insertion', () => {
  it.each(['one\n', 'one\r', 'one\r\n', 'one\ntwo'])('does not send %j before confirmation and cancel sends nothing', async text => {
    const s = setup(text)
    const operation = pasteIntoTerminal(s.term, 'bash', limits, event(), createPasteLane(), s.guard)
    await pending(s.controller)
    expect(s.paste).not.toHaveBeenCalled()
    s.controller.cancel()
    expect(await operation).toBe(true)
    expect(s.paste).not.toHaveBeenCalled()
  })
  it('sends the captured, limited text once, without rereading the clipboard', async () => {
    const s = setup('first\nsecond')
    const operation = pasteIntoTerminal(s.term, 'bash', { ...limits, maxPasteChars: 9 }, event(), createPasteLane(), s.guard)
    await pending(s.controller)
    s.readClipboardText.mockResolvedValue('changed clipboard')
    s.controller.resolve(true)
    await operation
    expect(s.paste.mock.calls).toEqual([['first\nsec']])
    expect(s.readClipboardText).toHaveBeenCalledOnce()
    expect(s.changed.mock.calls).toEqual([['owner'], [null]])
  })
  it('preserves immediate single-line and bracketed pastes', async () => {
    for (const [text, bracketed] of [['single line', false], ['first\nsecond\r', true]] as const) {
      const s = setup(text, bracketed)
      await pasteIntoTerminal(s.term, 'bash', limits, event(), createPasteLane(), s.guard)
      expect(s.changed).not.toHaveBeenCalled()
      expect(s.paste.mock.calls).toEqual([[text]])
    }
  })
  it('checks the effective mode, including ignoreBracketedPasteMode', async () => {
    const s = setup('first\nsecond', true)
    s.options.ignoreBracketedPasteMode = true
    const operation = pasteIntoTerminal(s.term, 'bash', limits, event(), createPasteLane(), s.guard)
    await pending(s.controller)
    s.controller.cancel()
    await operation
    expect(s.paste).not.toHaveBeenCalled()
  })
  it('fails closed if a multiline caller has no confirmation guard', async () => {
    const s = setup('first\nsecond')
    await pasteIntoTerminal(s.term, 'bash', limits, event(), createPasteLane())
    expect(s.paste).not.toHaveBeenCalled()
  })
  it('does not send to a retired or hidden target after acceptance', async () => {
    const s = setup('first\nsecond')
    const operation = pasteIntoTerminal(s.term, 'bash', limits, event(), createPasteLane(), s.guard)
    await pending(s.controller)
    s.retire()
    s.controller.resolve(true)
    await operation
    expect(s.paste).not.toHaveBeenCalled()
  })
  it('does not reread or queue another paste while a decision is pending', async () => {
    const s = setup('first\nsecond')
    const operation = pasteIntoTerminal(s.term, 'bash', limits, event(), createPasteLane(), s.guard)
    await pending(s.controller)
    await pasteIntoTerminal(s.term, 'bash', limits, event(), createPasteLane(), s.guard)
    expect(s.readClipboardText).toHaveBeenCalledOnce()
    s.controller.cancel()
    await operation
  })
  it('retires a clipboard reply started before another confirmation', async () => {
    const s = setup('unused')
    let reply!: (text: string) => void
    s.readClipboardText.mockImplementation(() => new Promise(resolve => { reply = resolve }))
    const operation = pasteIntoTerminal(s.term, 'bash', limits, event(), createPasteLane(), s.guard)
    for (let i = 0; i < 5 && !reply; i++) await Promise.resolve()
    const other = s.controller.request('other')
    s.controller.cancel()
    await other
    reply('late\nreply')
    await operation
    expect(s.paste).not.toHaveBeenCalled()
    expect(s.changed.mock.calls).toEqual([['other'], [null]])
  })
  it('checks line endings after the existing length limit', async () => {
    const s = setup('abcdef\nnot sent')
    await pasteIntoTerminal(s.term, 'bash', { ...limits, maxPasteChars: 6 }, event(), createPasteLane(), s.guard)
    expect(s.paste.mock.calls).toEqual([['abcdef']])
    expect(s.changed).not.toHaveBeenCalled()
  })
  it('guards text drops and preserves file-path priority', async () => {
    const s = setup('unused')
    const operation = dropIntoTerminal(s.term, 'bash', [], 'drop\ntext', limits, s.guard)
    await pending(s.controller)
    expect(s.paste).not.toHaveBeenCalled()
    s.controller.resolve(true)
    expect(await operation).toBe(true)
    expect(s.paste.mock.calls).toEqual([['drop\ntext']])
    await dropIntoTerminal(s.term, 'bash', ['safe file.txt'], 'ignored\ntext', limits, s.guard)
    expect(s.paste.mock.calls.at(-1)).toEqual(["'safe file.txt' "])
  })
  it('acknowledges Edit Paste immediately while the decision is still pending', async () => {
    const s = setup('first\nsecond')
    const off = registerTerminalEdit('owner', { term: s.term, shellId: 'bash', hasFocus: () => true, pasteGuard: s.guard })
    setFocusedTerminal('owner')
    try {
      expect(pasteFocusedTerminal(limits, event())).toBe(true)
      expect(s.readClipboardImage).not.toHaveBeenCalled()
      await vi.waitFor(() => expect(s.controller.isPending()).toBe(true))
      expect(s.paste).not.toHaveBeenCalled()
      s.controller.cancel()
      await Promise.resolve()
    } finally { off() }
  })
  it('retires the accelerator mate during a modal without leaving blocked halves', () => {
    const lane = createPasteLane()
    lane.shortcuts.push('started')
    discardPasteGesture({ role: 'accelerator', id: 'mate' }, lane)
    expect(lane).toEqual({ shortcuts: [], accelerators: [] })
    discardPasteGesture({ role: 'accelerator', id: 'blocked' }, lane)
    expect(lane).toEqual({ shortcuts: [], accelerators: [] })
  })
})
