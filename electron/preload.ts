import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { AppSettings, BootInfo, CreateResult, CreateSessionInput, SessionInfo, SettingsPatch, TerminalChunk, TerminalSnapshot } from '../src/shared/types'

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: unknown, payload: T) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  boot: (): Promise<BootInfo> => ipcRenderer.invoke('app:boot'),
  createSession: (input: CreateSessionInput): Promise<CreateResult> => ipcRenderer.invoke('sessions:create', input),
  closeSession: (id: string): Promise<void> => ipcRenderer.invoke('sessions:close', id),
  renameSession: (id: string, name: string): Promise<void> => ipcRenderer.invoke('sessions:rename', id, name),
  subscribe: (id: string): Promise<TerminalSnapshot> => ipcRenderer.invoke('sessions:subscribe', id),
  write: (id: string, data: string): void => {
    ipcRenderer.send('terminal:write', id, data)
  },
  resize: (id: string, cols: number, rows: number): void => {
    ipcRenderer.send('terminal:resize', id, cols, rows)
  },
  setWatching: (id: string | null, windowFocused: boolean): void => {
    ipcRenderer.send('terminal:watch', id, windowFocused)
  },
  pickDirectory: (defaultPath: string): Promise<string | null> => ipcRenderer.invoke('dialog:directory', defaultPath),
  updateSettings: (patch: SettingsPatch): Promise<AppSettings> => ipcRenderer.invoke('settings:update', patch),
  revealSettings: (): Promise<void> => ipcRenderer.invoke('settings:reveal'),
  openExternal: (url: string): void => {
    ipcRenderer.send('shell:openExternal', url)
  },
  writeClipboard: (text: string): Promise<boolean> => ipcRenderer.invoke('clipboard:writeText', text),
  readClipboardText: (): Promise<string> => ipcRenderer.invoke('clipboard:readText'),
  readClipboardImage: (): Promise<string | null> => ipcRenderer.invoke('clipboard:readImage'),
  pathForFile: (file: File): string => {
    try {
      const value = webUtils.getPathForFile(file)
      return typeof value === 'string' ? value : ''
    } catch {
      return ''
    }
  },
  onEditCommand: (callback: (command: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll') => boolean | Promise<boolean>): (() => void) => {
    const listener = (_event: unknown, payload: unknown) => {
      if (!payload || typeof payload !== 'object') return
      const source = payload as { id?: unknown; command?: unknown }
      const command = source.command
      if (typeof source.id !== 'string' || !/^[0-9a-f]{16}$/.test(source.id)) return
      if (command !== 'undo' && command !== 'redo' && command !== 'cut' && command !== 'copy' && command !== 'paste' && command !== 'selectAll') {
        return
      }
      void Promise.resolve()
        .then(() => callback(command))
        .then(
          (handled) => ipcRenderer.send('edit:result', { id: source.id, handled: handled === true }),
          () => ipcRenderer.send('edit:result', { id: source.id, handled: false }),
        )
    }
    ipcRenderer.on('edit:command', listener)
    return () => ipcRenderer.removeListener('edit:command', listener)
  },
  onSessions: (callback: (sessions: SessionInfo[]) => void): (() => void) => subscribe('sessions:updated', callback),
  onData: (callback: (chunk: TerminalChunk) => void): (() => void) => subscribe('terminal:data', callback),
  onFocus: (callback: (id: string) => void): (() => void) => subscribe('session:focus', callback),
  onSystemTheme: (callback: (dark: boolean) => void): (() => void) => subscribe('theme:system', callback),
  onSettings: (callback: (settings: AppSettings) => void): (() => void) => subscribe('settings:updated', callback),
}

contextBridge.exposeInMainWorld('plancia', api)

export type PlanciaApi = typeof api
