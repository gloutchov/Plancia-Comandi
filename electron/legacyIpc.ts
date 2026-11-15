import { ipcMain } from 'electron'
import { LEGACY_CHANNELS, dispatchLegacyIpc, type LegacyEffects } from '../src/shared/legacyIpc'
import { protectMainEffect } from './diagnostics'
import type { IpcSenderEvent } from '../src/shared/ipcSender'

export function registerLegacyIpc(options: {
  isSender: (event: IpcSenderEvent) => boolean
  appContents: () => Electron.WebContents | null
  maxWriteChars: () => number
  effects: LegacyEffects
}): void {
  for (const entry of LEGACY_CHANNELS) {
    const listener = (event: IpcSenderEvent, ...args: unknown[]) =>
      protectMainEffect(() => dispatchLegacyIpc(entry.channel, event, args, options.isSender(event) ? options.appContents() : null, options.effects, {
        maxWriteChars: options.maxWriteChars(),
      }), entry.channel === 'sessions:create' ? { ok: false, error: 'operation-failed' }
        : entry.channel === 'sessions:subscribe' ? { seq: 0, data: '' } : null)
    if (entry.kind === 'handle') ipcMain.handle(entry.channel, listener)
    else ipcMain.on(entry.channel, listener)
  }
}
