import { app, BrowserWindow, Menu, Notification, dialog, ipcMain, nativeTheme, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SessionManager } from './sessions'
import { SettingsStore } from './settings'
import { defaultShellId, detectShells } from './shells'
import type { BootInfo, CreateSessionInput, SettingsPatch, ShellChoice, ThemeSetting } from '../src/shared/types'
import pkg from '../package.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '..')
const RENDERER_DIST = path.join(APP_ROOT, 'dist')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let win: BrowserWindow | null = null
let manager: SessionManager | null = null
let settings: SettingsStore | null = null
let shellChoices: ShellChoice[] = []
let demoStarted = false

function preloadPath(): string {
  for (const name of ['preload.mjs', 'preload.js', 'preload.cjs']) {
    const candidate = path.join(__dirname, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return path.join(__dirname, 'preload.mjs')
}

function currentWindow(): BrowserWindow | null {
  if (win && !win.isDestroyed()) return win
  return null
}

function send(channel: string, payload?: unknown): void {
  const current = currentWindow()
  if (!current) return
  current.webContents.send(channel, payload)
}

function publishSettings(): void {
  if (settings) send('settings:updated', settings.data)
}

function applyThemeSource(theme: ThemeSetting): void {
  nativeTheme.themeSource = theme === 'system' ? 'system' : theme
}

function isDark(theme: ThemeSetting): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return nativeTheme.shouldUseDarkColors
}

function bootInfo(): BootInfo {
  if (!settings) throw new Error('Settings are not ready')
  return {
    platform: process.platform,
    home: app.getPath('home'),
    version: pkg.version,
    demo: process.env.MOLO_DEMO === '1',
    systemDark: nativeTheme.shouldUseDarkColors,
    settings: settings.data,
    sessions: manager?.list() ?? [],
    shells: shellChoices,
  }
}

function notify(title: string, body: string, sessionId: string): void {
  if (!Notification.isSupported()) return
  const note = new Notification({ title, body })
  note.on('click', () => {
    const current = currentWindow()
    if (!current) return
    if (current.isMinimized()) current.restore()
    current.show()
    current.focus()
    current.webContents.send('session:focus', sessionId)
  })
  note.show()
}

function asCreateInput(value: unknown): CreateSessionInput {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    name: typeof source.name === 'string' ? source.name : undefined,
    shellId: typeof source.shellId === 'string' ? source.shellId : undefined,
    cwd: typeof source.cwd === 'string' ? source.cwd : undefined,
  }
}

function registerIpc(): void {
  ipcMain.handle('app:boot', () => bootInfo())

  ipcMain.handle('sessions:create', (_event, input: unknown) => {
    const result = manager?.create(asCreateInput(input)) ?? { ok: false, error: 'pty-missing' }
    publishSettings()
    return result
  })

  ipcMain.handle('sessions:close', (_event, id: unknown) => {
    if (typeof id === 'string') manager?.close(id)
  })

  ipcMain.handle('sessions:rename', (_event, id: unknown, name: unknown) => {
    if (typeof id === 'string' && typeof name === 'string') manager?.rename(id, name)
  })

  ipcMain.handle('sessions:subscribe', (_event, id: unknown) => {
    if (typeof id !== 'string' || !manager) return { seq: 0, data: '' }
    return manager.subscribe(id)
  })

  ipcMain.handle('settings:update', (_event, patch: unknown) => {
    if (!settings || !patch || typeof patch !== 'object') return settings?.data
    const next = settings.update(patch as SettingsPatch)
    applyThemeSource(next.theme)
    manager?.retick()
    return next
  })

  ipcMain.handle('settings:reveal', () => {
    if (settings) shell.showItemInFolder(settings.file)
  })

  ipcMain.handle('dialog:directory', async (_event, defaultPath: unknown) => {
    const current = currentWindow()
    if (!current) return null
    const result = await dialog.showOpenDialog(current, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: typeof defaultPath === 'string' ? defaultPath : undefined,
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.on('terminal:write', (_event, id: unknown, data: unknown) => {
    if (typeof id === 'string' && typeof data === 'string') manager?.write(id, data)
  })

  ipcMain.on('terminal:resize', (_event, id: unknown, cols: unknown, rows: unknown) => {
    if (typeof id === 'string' && typeof cols === 'number' && typeof rows === 'number') {
      manager?.resize(id, cols, rows)
    }
  })

  ipcMain.on('terminal:watch', (_event, id: unknown, focused: unknown) => {
    manager?.setWatching(typeof id === 'string' ? id : null, focused === true)
  })

  ipcMain.on('shell:openExternal', (_event, url: unknown) => {
    if (typeof url !== 'string') return
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') void shell.openExternal(parsed.toString())
    } catch {
      // Ignore malformed links from the terminal.
    }
  })
}

function installMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function startDemo(): Promise<void> {
  if (!manager || demoStarted) return
  demoStarted = true
  await delay(700)
  settings?.update({ theme: 'dark' })
  applyThemeSource('dark')
  publishSettings()
  const script = path.join(APP_ROOT, 'scripts', 'demo-codex.sh')
  const scriptOnDisk = fs.existsSync(script) && !script.includes(`${path.sep}app.asar`)
  const demoCwd = scriptOnDisk ? APP_ROOT : app.getPath('home')
  const codex = manager.create({ name: 'Codex', cwd: demoCwd })
  const shellSession = manager.create({ name: 'Shell', cwd: app.getPath('home') })
  publishSettings()
  if (codex.ok && scriptOnDisk) {
    manager.write(codex.session.id, `bash ${JSON.stringify(script)} busy\n`)
  }
  if (shellSession.ok) {
    manager.write(shellSession.session.id, 'clear\n')
  }
  if (process.env.MOLO_SHOT_DIR && win) {
    await captureShots(win, process.env.MOLO_SHOT_DIR)
  }
}

async function captureShots(window: BrowserWindow, dir: string): Promise<void> {
  fs.mkdirSync(dir, { recursive: true })
  await delay(3200)
  fs.writeFileSync(path.join(dir, 'molo-dark.png'), (await window.capturePage()).toPNG())
  settings?.update({ theme: 'light' })
  applyThemeSource('light')
  publishSettings()
  await delay(900)
  fs.writeFileSync(path.join(dir, 'molo-light.png'), (await window.capturePage()).toPNG())
  await window.webContents.executeJavaScript(
    `document.querySelector('[data-testid="open-settings"]')?.click()`,
  )
  await delay(600)
  fs.writeFileSync(path.join(dir, 'molo-settings.png'), (await window.capturePage()).toPNG())
  if (process.env.MOLO_SHOT_EXIT === '1') app.quit()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createWindow(): void {
  const darwin = process.platform === 'darwin'
  const dark = settings ? isDark(settings.data.theme) : true
  win = new BrowserWindow({
    width: process.env.MOLO_DEMO === '1' ? 1440 : 1280,
    height: process.env.MOLO_DEMO === '1' ? 900 : 820,
    minWidth: 860,
    minHeight: 560,
    show: false,
    backgroundColor: dark ? '#12141a' : '#f3f0e8',
    title: 'Molo',
    autoHideMenuBar: true,
    titleBarStyle: darwin ? 'hiddenInset' : 'default',
    trafficLightPosition: darwin ? { x: 16, y: 18 } : undefined,
    icon: path.join(APP_ROOT, 'build', 'icon.png'),
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.webContents.on('preload-error', (_event, preload, error) => {
    console.error('preload error', preload, error)
  })
  win.once('ready-to-show', () => win?.show())
  win.on('closed', () => {
    win = null
  })
  win.webContents.on('did-finish-load', () => {
    if (process.env.MOLO_DEMO === '1') void startDemo()
  })

  if (VITE_DEV_SERVER_URL) void win.loadURL(VITE_DEV_SERVER_URL)
  else void win.loadFile(path.join(RENDERER_DIST, 'index.html'))

  if (process.env.MOLO_DEVTOOLS === '1') win.webContents.openDevTools({ mode: 'detach' })
}

function start(): void {
  const home = app.getPath('home')
  settings = new SettingsStore(home)
  if (process.env.MOLO_DEMO === '1') nativeTheme.themeSource = 'dark'
  else applyThemeSource(settings.data.theme)

  shellChoices = detectShells()
  if (!settings.data.lastShellId) settings.data.lastShellId = defaultShellId(shellChoices)

  manager = new SessionManager({
    getWindow: currentWindow,
    settings,
    shells: shellChoices,
    home,
    notify,
  })

  nativeTheme.on('updated', () => {
    send('theme:system', nativeTheme.shouldUseDarkColors)
  })

  registerIpc()
  installMenu()
  createWindow()
}

if (process.platform === 'win32') app.setAppUserModelId('it.molo.desktop')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const current = currentWindow()
    if (!current) {
      createWindow()
      return
    }
    if (current.isMinimized()) current.restore()
    current.show()
    current.focus()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('before-quit', () => {
    manager?.dispose()
  })

  app.whenReady().then(start).catch((error) => {
    console.error(error)
    app.quit()
  })
}
