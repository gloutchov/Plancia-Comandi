import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerLegacyIpc } from '../../electron/legacyIpc'
import { registerClipboardIpc } from '../../electron/clipboardIpc'
import { registerEditIpc } from '../../electron/editMenu'
import { APP_CONFIG_DEFAULTS } from './appConfig'
import { LEGACY_CHANNELS, type LegacyEffects } from './legacyIpc'
import { isTrustedRendererSender, type IpcSenderEvent } from './ipcSender'

const mock = vi.hoisted(() => ({
  handle: new Map<string, (...args: any[]) => any>(),
  on: new Map<string, (...args: any[]) => any>(),
  clipboard: { writeText: vi.fn(), readText: vi.fn(() => 'synthetic'), read: vi.fn(() => []) },
}))
vi.mock('electron', () => ({
  ipcMain: { handle: (name: string, fn: (...args: any[]) => any) => mock.handle.set(name, fn), on: (name: string, fn: (...args: any[]) => any) => mock.on.set(name, fn) },
  clipboard: mock.clipboard, nativeImage: {},
}))
const url = 'file:///synthetic/app.asar/dist/index.html'
const frame = { url }
const contents = { mainFrame: frame, isDestroyed: () => false }
const accepted = { sender: contents, senderFrame: frame }
const effect = vi.fn()
const keys = ['boot', 'create', 'close', 'rename', 'subscribe', 'updateSettings', 'currentSettings', 'revealSettings', 'pickDirectory', 'write', 'resize', 'watch', 'openExternal']
const effects = Object.fromEntries(keys.map(key => [key, effect])) as unknown as LegacyEffects
const valid: Record<string, unknown[]> = {
  'app:boot': [], 'sessions:create': [{}], 'sessions:close': ['11111111-1111-4111-8111-111111111111'],
  'sessions:rename': ['11111111-1111-4111-8111-111111111111', 'Synthetic'], 'sessions:subscribe': ['11111111-1111-4111-8111-111111111111'],
  'settings:update': [{ theme: 'dark' }], 'settings:reveal': [], 'dialog:directory': ['/synthetic'],
  'terminal:write': ['11111111-1111-4111-8111-111111111111', 'synthetic'], 'terminal:resize': ['11111111-1111-4111-8111-111111111111', 80, 24],
  'terminal:watch': [null, true], 'shell:openExternal': ['https://example.test/'],
  'clipboard:writeText': ['synthetic'], 'clipboard:readText': [], 'clipboard:readImage': [], 'edit:result': [{ id: '0123456789abcdef', handled: false }],
}

beforeEach(() => {
  vi.clearAllMocks(); mock.handle.clear(); mock.on.clear()
  const isSender = (event: IpcSenderEvent) => isTrustedRendererSender(event, contents, url)
  registerLegacyIpc({ isSender, appContents: () => contents as never, maxWriteChars: () => 100, effects })
  registerClipboardIpc({ isSender, getConfig: () => APP_CONFIG_DEFAULTS, userDataDir: '/never-used' })
  registerEditIpc(isSender)
})

describe('registered privileged channels', () => {
  it('registers all 16 inbound channels with the shared boundary', () => {
    expect([...mock.handle.keys(), ...mock.on.keys()].sort()).toEqual(Object.keys(valid).sort())
  })

  it.each(Object.keys(valid))('rejects a foreign window, subframe, disposed frame and foreign URL on %s before effects', async channel => {
    const listener = mock.handle.get(channel) ?? mock.on.get(channel)!
    const events = [
      { sender: {}, senderFrame: frame },
      { sender: contents, senderFrame: { url } },
      { sender: contents, senderFrame: null },
    ]
    for (const event of events) await listener(event, ...valid[channel])
    frame.url = 'file:///synthetic/other.html'
    try { await listener(accepted, ...valid[channel]) } finally { frame.url = url }
    expect(effect).not.toHaveBeenCalled()
    for (const fn of Object.values(mock.clipboard)) expect(fn).not.toHaveBeenCalled()
  })

  it('still dispatches valid legacy and clipboard calls from the main document', async () => {
    for (const { channel } of LEGACY_CHANNELS) await (mock.handle.get(channel) ?? mock.on.get(channel)!)(accepted, ...valid[channel])
    expect(effect).toHaveBeenCalledTimes(LEGACY_CHANNELS.length)
    expect(await mock.handle.get('clipboard:writeText')!(accepted, 'synthetic')).toBe(true)
    expect(await mock.handle.get('clipboard:readText')!(accepted)).toBe('synthetic')
    expect(await mock.handle.get('clipboard:readImage')!(accepted)).toBeNull()
  })

  it('rejects malformed and extra clipboard payloads without accessing the OS clipboard', async () => {
    for (const [channel, args] of [['clipboard:writeText', [null]], ['clipboard:writeText', ['synthetic', true]], ['clipboard:readText', [true]], ['clipboard:readImage', [true]]] as const) {
      await mock.handle.get(channel)!(accepted, ...args)
    }
    for (const fn of Object.values(mock.clipboard)) expect(fn).not.toHaveBeenCalled()
  })
})
