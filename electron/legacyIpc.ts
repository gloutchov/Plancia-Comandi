import { ipcMain } from 'electron'
import { LEGACY_CHANNELS, dispatchLegacyIpc, type LegacyEffects } from '../src/shared/legacyIpc'

export function registerLegacyIpc(options: {
  appContents: () => Electron.WebContents | null
  maxWriteChars: () => number
  effects: LegacyEffects
}): void {
  for (const entry of LEGACY_CHANNELS) {
    const listener = (event: { sender: Electron.WebContents }, ...args: unknown[]) =>
      dispatchLegacyIpc(entry.channel, event, args, options.appContents(), options.effects, {
        maxWriteChars: options.maxWriteChars(),
      })
    if (entry.kind === 'handle') ipcMain.handle(entry.channel, listener)
    else ipcMain.on(entry.channel, listener)
  }
}
