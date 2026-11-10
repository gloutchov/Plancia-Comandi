import { contextBridge, ipcRenderer } from 'electron'
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
  onSessions: (callback: (sessions: SessionInfo[]) => void): (() => void) => subscribe('sessions:updated', callback),
  onData: (callback: (chunk: TerminalChunk) => void): (() => void) => subscribe('terminal:data', callback),
  onFocus: (callback: (id: string) => void): (() => void) => subscribe('session:focus', callback),
  onSystemTheme: (callback: (dark: boolean) => void): (() => void) => subscribe('theme:system', callback),
  onSettings: (callback: (settings: AppSettings) => void): (() => void) => subscribe('settings:updated', callback),
}

contextBridge.exposeInMainWorld('molo', api)

export type MoloApi = typeof api
