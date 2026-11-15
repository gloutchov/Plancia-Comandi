import { ipcMain } from 'electron'
import { LEGACY_CHANNELS, dispatchLegacyIpc, type LegacyEffects } from '../src/shared/legacyIpc'
import { protectMainEffect } from './diagnostics'

export function registerLegacyIpc(options: {
  appContents: () => Electron.WebContents | null
  maxWriteChars: () => number
  effects: LegacyEffects
}): void {
  for (const entry of LEGACY_CHANNELS) {
    const listener = (event: { sender: Electron.WebContents }, ...args: unknown[]) =>
      protectMainEffect(() => dispatchLegacyIpc(entry.channel, event, args, options.appContents(), options.effects, {
        maxWriteChars: options.maxWriteChars(),
      }), entry.channel === 'sessions:create' ? { ok: false, error: 'operation-failed' }
        : entry.channel === 'sessions:subscribe' ? { seq: 0, data: '' } : null)
    if (entry.kind === 'handle') ipcMain.handle(entry.channel, listener)
    else ipcMain.on(entry.channel, listener)
  }
}
