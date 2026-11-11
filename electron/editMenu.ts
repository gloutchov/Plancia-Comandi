import { randomBytes } from 'node:crypto'
import { BrowserWindow, ipcMain, Menu } from 'electron'
import { translate, type MessageKey } from '../src/shared/i18n'
import type { Locale } from '../src/shared/types'

export type EditCommand = 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll'

type IpcEvent = { sender: Electron.WebContents }

const pending = new Map<string, (handled: boolean) => void>()

export function registerEditIpc(isSender: (event: IpcEvent) => boolean): void {
  ipcMain.on('edit:result', (event, payload: unknown) => {
    if (!isSender(event) || !payload || typeof payload !== 'object') return
    const source = payload as { id?: unknown; handled?: unknown }
    if (typeof source.id !== 'string' || typeof source.handled !== 'boolean') return
    const resolve = pending.get(source.id)
    if (!resolve) return
    pending.delete(source.id)
    resolve(source.handled)
  })
}

function fallback(command: EditCommand, window: BrowserWindow): void {
  if (window.isDestroyed()) return
  const contents = window.webContents
  if (command === 'undo') contents.undo()
  else if (command === 'redo') contents.redo()
  else if (command === 'cut') contents.cut()
  else if (command === 'copy') contents.copy()
  else if (command === 'paste') contents.paste()
  else contents.selectAll()
}

function requestEdit(command: EditCommand, getWindow: () => BrowserWindow | null): void {
  const current = getWindow()
  if (!current) return
  const id = randomBytes(8).toString('hex')
  const timer = setTimeout(() => {
    if (!pending.has(id)) return
    pending.delete(id)
    fallback(command, current)
  }, 400)
  pending.set(id, (handled) => {
    clearTimeout(timer)
    if (!handled && !current.isDestroyed()) fallback(command, current)
  })
  current.webContents.send('edit:command', { id, command })
}

function item(label: string, accelerator: string | undefined, command: EditCommand, getWindow: () => BrowserWindow | null): Electron.MenuItemConstructorOptions {
  return {
    label,
    accelerator,
    click: () => requestEdit(command, getWindow),
  }
}

export function installApplicationMenu(locale: Locale, getWindow: () => BrowserWindow | null): void {
  const t = (key: MessageKey) => translate(locale, key)
  const darwin = process.platform === 'darwin'
  const undo = darwin ? 'Command+Z' : undefined
  const redo = darwin ? 'Shift+Command+Z' : undefined
  const cut = darwin ? 'Command+X' : undefined
  const selectAll = darwin ? 'Command+A' : undefined
  const copy = darwin ? 'Command+C' : 'Ctrl+Shift+C'
  const paste = darwin ? 'Command+V' : 'Ctrl+Shift+V'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(darwin ? [{ role: 'appMenu' as const }] : []),
    {
      label: t('menuEdit'),
      submenu: [
        item(t('menuUndo'), undo, 'undo', getWindow),
        item(t('menuRedo'), redo, 'redo', getWindow),
        { type: 'separator' },
        item(t('menuCut'), cut, 'cut', getWindow),
        item(t('menuCopy'), copy, 'copy', getWindow),
        item(t('menuPaste'), paste, 'paste', getWindow),
        { type: 'separator' },
        item(t('menuSelectAll'), selectAll, 'selectAll', getWindow),
      ],
    },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
