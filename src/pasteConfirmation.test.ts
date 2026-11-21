import { describe, expect, it, vi } from 'vitest'
import { PasteConfirmationController } from './pasteConfirmation'

describe('paste confirmation lifecycle', () => {
  it('holds one decision without replacing it or queuing another', async () => {
    const changed = vi.fn()
    const controller = new PasteConfirmationController(changed)
    const first = controller.request('session-one')
    expect(controller.canStart()).toBe(false)
    expect(await controller.request('session-two')).toBe(false)
    expect(changed.mock.calls).toEqual([['session-one']])
    controller.resolve(true)
    expect(await first).toBe(true)
    expect(changed.mock.calls).toEqual([['session-one'], [null]])
    expect(controller.canStart()).toBe(true)
  })
  it('cancels, retires the old revision and resolves only once', async () => {
    const controller = new PasteConfirmationController(vi.fn())
    const before = controller.revision()
    const decision = controller.request('session-one')
    controller.cancel()
    controller.resolve(true)
    expect(await decision).toBe(false)
    expect(controller.revision()).toBeGreaterThan(before)
    const current = controller.revision()
    controller.cancel()
    expect(controller.revision()).toBeGreaterThan(current)
  })
  it('refuses requests and acceptance while another dialog or unmount blocks editing', async () => {
    let allowed = false
    const changed = vi.fn()
    const controller = new PasteConfirmationController(changed, () => allowed)
    expect(await controller.request('session')).toBe(false)
    expect(changed).not.toHaveBeenCalled()
    allowed = true
    const decision = controller.request('session')
    allowed = false
    controller.resolve(true)
    expect(await decision).toBe(false)
  })
})
