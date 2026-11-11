import { app, BrowserWindow, Notification, dialog, nativeTheme, session, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SessionManager } from './sessions'
import { SettingsStore } from './settings'
import { defaultShellId, detectShells } from './shells'
import type { BootInfo, ShellChoice, ThemeSetting } from '../src/shared/types'
import { loadAppConfig, resolveAppConfigFile, runtimeLimits, validateAppConfig, type AppConfig } from '../src/shared/appConfig'
import { cleanupClipboardImages } from '../src/shared/clipboardImages'
import { contentSecurityPolicyForUrl, withContentSecurityPolicy } from '../src/shared/csp'
import { shouldBlockNavigation } from '../src/shared/navigation'
import { registerClipboardIpc } from './clipboardIpc'
import { installApplicationMenu, registerEditIpc } from './editMenu'
import { registerLegacyIpc } from './legacyIpc'
import pkg from '../package.json'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '..')
const RENDERER_DIST = path.join(APP_ROOT, 'dist')
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const APP_TITLE = 'Plancia Comandi'

function envFlag(name: string, legacy: string): boolean {
  return process.env[name] === '1' || process.env[legacy] === '1'
}

function envText(name: string, legacy: string): string | undefined {
  return process.env[name] || process.env[legacy]
}

const demoMode = () => envFlag('PLANCIA_DEMO', 'MOLO_DEMO')

let win: BrowserWindow | null = null
let manager: SessionManager | null = null
let settings: SettingsStore | null = null
let shellChoices: ShellChoice[] = []
let demoStarted = false
let appConfig: AppConfig = validateAppConfig(null)

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
    demo: demoMode(),
    systemDark: nativeTheme.shouldUseDarkColors,
    settings: settings.data,
    sessions: manager?.list() ?? [],
    shells: shellChoices,
    limits: runtimeLimits(appConfig),
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

function isAppSender(event: { sender: Electron.WebContents }): boolean {
  const current = currentWindow()
  return !!current && event.sender === current.webContents
}

function registerIpc(): void {
  registerClipboardIpc({
    isSender: isAppSender,
    getConfig: () => appConfig,
    userDataDir: app.getPath('userData'),
  })
  registerEditIpc(isAppSender)
  registerLegacyIpc({
    appContents: () => currentWindow()?.webContents ?? null,
    maxWriteChars: () => appConfig.terminal.maxWriteChars,
    effects: {
      boot: () => bootInfo(),
      create: (input) => {
        const result = manager?.create(input) ?? { ok: false, error: 'pty-missing' }
        publishSettings()
        return result
      },
      close: (id) => {
        manager?.close(id)
      },
      rename: (id, name) => {
        manager?.rename(id, name)
      },
      subscribe: (id) => (manager ? manager.subscribe(id) : { seq: 0, data: '' }),
      updateSettings: (patch) => {
        if (!settings) return null
        const next = settings.update(patch)
        applyThemeSource(next.theme)
        installApplicationMenu(next.locale, currentWindow)
        manager?.retick()
        return next
      },
      revealSettings: () => {
        if (settings) shell.showItemInFolder(settings.file)
      },
      pickDirectory: async (defaultPath) => {
        const current = currentWindow()
        if (!current) return null
        const result = await dialog.showOpenDialog(current, {
          properties: ['openDirectory', 'createDirectory'],
          defaultPath: defaultPath || undefined,
        })
        if (result.canceled || result.filePaths.length === 0) return null
        return result.filePaths[0]
      },
      write: (id, data) => {
        manager?.write(id, data)
      },
      resize: (id, cols, rows) => {
        manager?.resize(id, cols, rows)
      },
      watch: (id, focused) => {
        manager?.setWatching(id, focused)
      },
      openExternal: (url) => {
        void shell.openExternal(url)
      },
    },
  })
}

function installContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const policy = contentSecurityPolicyForUrl(details.url, VITE_DEV_SERVER_URL)
    if (!policy) {
      callback({ responseHeaders: details.responseHeaders })
      return
    }
    callback({ responseHeaders: withContentSecurityPolicy(details.responseHeaders, policy) })
  })
}

function guardNavigation(window: BrowserWindow): void {
  const contents = window.webContents
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  const block = (event: Electron.Event, url: string) => {
    if (shouldBlockNavigation(url, contents.getURL(), VITE_DEV_SERVER_URL)) event.preventDefault()
  }
  contents.on('will-navigate', block)
  contents.on('will-redirect', block)
}

function installMenu(): void {
  installApplicationMenu(settings?.data.locale ?? 'it', currentWindow)
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
  const shotDir = envText('PLANCIA_SHOT_DIR', 'MOLO_SHOT_DIR')
  if (shotDir && win) await captureShots(win, shotDir)
}

async function captureShots(window: BrowserWindow, dir: string): Promise<void> {
  fs.mkdirSync(dir, { recursive: true })
  await delay(3200)
  fs.writeFileSync(path.join(dir, 'plancia-dark.png'), (await window.capturePage()).toPNG())
  settings?.update({ theme: 'light' })
  applyThemeSource('light')
  publishSettings()
  await delay(900)
  fs.writeFileSync(path.join(dir, 'plancia-light.png'), (await window.capturePage()).toPNG())
  await window.webContents.executeJavaScript(
    `document.querySelector('[data-testid="open-settings"]')?.click()`,
  )
  await delay(600)
  fs.writeFileSync(path.join(dir, 'plancia-settings.png'), (await window.capturePage()).toPNG())
  if (envFlag('PLANCIA_SHOT_EXIT', 'MOLO_SHOT_EXIT')) app.quit()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createWindow(): void {
  const darwin = process.platform === 'darwin'
  const dark = settings ? isDark(settings.data.theme) : true
  win = new BrowserWindow({
    width: demoMode() ? 1440 : 1280,
    height: demoMode() ? 900 : 820,
    minWidth: 860,
    minHeight: 560,
    show: false,
    backgroundColor: dark ? '#12141a' : '#f3f0e8',
    title: APP_TITLE,
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
  guardNavigation(win)
  win.once('ready-to-show', () => win?.show())
  win.on('closed', () => {
    win = null
  })
  win.webContents.on('did-finish-load', () => {
    if (demoMode()) void startDemo()
  })

  if (VITE_DEV_SERVER_URL) void win.loadURL(VITE_DEV_SERVER_URL)
  else void win.loadFile(path.join(RENDERER_DIST, 'index.html'))

  if (envFlag('PLANCIA_DEVTOOLS', 'MOLO_DEVTOOLS')) win.webContents.openDevTools({ mode: 'detach' })
}

function start(): void {
  const home = app.getPath('home')
  appConfig = loadAppConfig(resolveAppConfigFile(APP_ROOT, process.resourcesPath))
  cleanupClipboardImages(app.getPath('userData'), appConfig.clipboardImages)
  settings = new SettingsStore(home)
  if (demoMode()) nativeTheme.themeSource = 'dark'
  else applyThemeSource(settings.data.theme)

  shellChoices = detectShells()
  if (!settings.data.lastShellId) settings.data.lastShellId = defaultShellId(shellChoices)

  manager = new SessionManager({
    getWindow: currentWindow,
    settings,
    shells: shellChoices,
    home,
    notify,
    maxWriteChars: appConfig.terminal.maxWriteChars,
  })

  nativeTheme.on('updated', () => {
    send('theme:system', nativeTheme.shouldUseDarkColors)
  })

  installContentSecurityPolicy()
  registerIpc()
  installMenu()
  createWindow()
}

app.setName(APP_TITLE)
if (process.platform === 'win32') app.setAppUserModelId('it.plancia.comandi')

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
