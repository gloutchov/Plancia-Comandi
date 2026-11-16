import { app, BrowserWindow, Notification, dialog, nativeTheme, session, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { SessionManager } from './sessions'
import { SettingsStore } from './settings'
import { defaultShellId, detectShells } from './shells'
import type { BootInfo, ShellChoice, ThemeSetting } from '../src/shared/types'
import { loadAppConfig, resolveAppConfigFile, runtimeLimits, validateAppConfig, type AppConfig } from '../src/shared/appConfig'
import { cleanupClipboardImages } from '../src/shared/clipboardImages'
import { contentSecurityPolicyForUrl, rendererDevServerUrl, withContentSecurityPolicy } from '../src/shared/csp'
import { shouldBlockNavigation } from '../src/shared/navigation'
import { registerClipboardIpc } from './clipboardIpc'
import { installApplicationMenu, registerEditIpc } from './editMenu'
import { registerLegacyIpc } from './legacyIpc'
import pkg from '../package.json'
import { configureDiagnostics, reportDiagnostic } from './diagnostics'
import { packagedPtyNodeCandidates } from '../src/shared/ptyProbe'
import { createStartupTrace, startupFailureDetail, type StartupTrace } from '../src/shared/startupTrace'
import { canonicalDocumentUrl, isTrustedRendererSender, type IpcSenderEvent } from '../src/shared/ipcSender'
import { denyRendererPermissions } from './permissions'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '..')
const RENDERER_DIST = path.join(APP_ROOT, 'dist')
const APP_TITLE = 'Plancia Comandi'

function devServerUrl(): string | undefined {
  return rendererDevServerUrl(app.isPackaged, process.env['VITE_DEV_SERVER_URL'])
}

function rendererDocumentUrl(): string {
  const raw = devServerUrl() ?? pathToFileURL(path.join(RENDERER_DIST, 'index.html')).href
  return canonicalDocumentUrl(raw) ?? raw
}

function envFlag(name: string, legacy: string): boolean {
  return process.env[name] === '1' || process.env[legacy] === '1'
}

function envText(name: string, legacy: string): string | undefined {
  return process.env[name] || process.env[legacy]
}

const demoMode = () => envFlag('PLANCIA_DEMO', 'MOLO_DEMO')
const startupTrace: StartupTrace | null = process.env.PLANCIA_DIAG_STARTUP === '1'
  ? createStartupTrace(process.env.PLANCIA_DIAG_DIR)
  : null
if (startupTrace) {
  const appExit = app.exit.bind(app)
  app.exit = ((code?: number) => {
    startupTrace.event('app.exit', { reason: startupTrace.reason(), code: typeof code === 'number' ? code : null, ready: app.isReady() })
    return appExit(code)
  }) as typeof app.exit
  const processExit = process.exit.bind(process)
  process.exit = ((code?: number) => {
    startupTrace.event('process.exit', { reason: startupTrace.reason(), code: typeof code === 'number' ? code : null, ready: app.isReady() })
    return processExit(code)
  }) as typeof process.exit
}

function quitFor(reason: string): void {
  startupTrace?.setQuitReason(reason)
  startupTrace?.event('app.quit', { reason, ready: app.isReady() })
  app.quit()
}

let startupStep = 'load'

function failStartup(error: unknown): void {
  try { startupTrace?.event('startup-failed', startupFailureDetail(startupStep, error)) } catch { /* quit still has to run */ }
  reportDiagnostic('startup-failed', error)
  quitFor('startup-failed')
}

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
  if (settings) {
    send('settings:updated', settings.data)
    send('settings:warning', settings.warning)
  }
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
    settingsWarning: settings.warning,
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

function isAppSender(event: IpcSenderEvent): boolean {
  const current = currentWindow()
  return isTrustedRendererSender(event, current?.webContents ?? null, rendererDocumentUrl())
}

function registerIpc(): void {
  registerClipboardIpc({
    isSender: isAppSender,
    getConfig: () => appConfig,
    userDataDir: app.getPath('userData'),
  })
  registerEditIpc(isAppSender)
  registerLegacyIpc({
    isSender: isAppSender,
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
        publishSettings()
        return next
      },
      currentSettings: () => settings?.data ?? null,
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
        return shell.openExternal(url)
      },
    },
  })
}

function installContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const policy = contentSecurityPolicyForUrl(details.url, devServerUrl())
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
    if (shouldBlockNavigation(url, contents.getURL(), devServerUrl())) event.preventDefault()
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
  if (envFlag('PLANCIA_SHOT_EXIT', 'MOLO_SHOT_EXIT')) quitFor('shot-exit')
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

  win.webContents.on('preload-error', (_event, _preload, error) => {
    reportDiagnostic('preload-failed', error)
    startupTrace?.event('preload-error', { code: error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : 'UNKNOWN' })
  })
  win.webContents.on('render-process-gone', (_event, details) => {
    startupTrace?.event('render-process-gone', { reason: details.reason, exitCode: details.exitCode })
  })
  guardNavigation(win)
  win.once('ready-to-show', () => win?.show())
  win.on('closed', () => {
    win = null
  })
  win.webContents.on('did-finish-load', () => {
    if (demoMode()) void startDemo()
  })

  // Load the exact URL accepted by IPC, including encoded ~ and an uppercase Windows drive letter.
  void win.loadURL(rendererDocumentUrl())

  if (envFlag('PLANCIA_DEVTOOLS', 'MOLO_DEVTOOLS')) win.webContents.openDevTools({ mode: 'detach' })
}

function traceStartupFiles(): void {
  if (!startupTrace) return
  startupStep = 'paths'
  startupTrace.event('paths', {
    userData: app.getPath('userData'),
    home: app.getPath('home'),
    appData: app.getPath('appData'),
    homeEnv: process.env.HOME ?? '',
    appDataEnv: process.env.APPDATA ?? '',
    localAppData: process.env.LOCALAPPDATA ?? '',
    appPath: app.getAppPath(),
    dirname: __dirname,
    resourcesPath: process.resourcesPath,
  })
  startupStep = 'files'
  const html = path.join(RENDERER_DIST, 'index.html')
  const config = resolveAppConfigFile(APP_ROOT, process.resourcesPath)
  startupTrace.event('files', {
    preload: fs.existsSync(preloadPath()),
    html: fs.existsSync(html),
    config: fs.existsSync(config),
    pty: packagedPtyNodeCandidates(process.resourcesPath).some((file) => fs.existsSync(file)),
  })
}

function start(): void {
  startupStep = 'trace'
  traceStartupFiles()
  startupStep = 'home'
  const home = app.getPath('home')
  startupStep = 'config'
  appConfig = loadAppConfig(resolveAppConfigFile(APP_ROOT, process.resourcesPath))
  startupStep = 'diagnostics'
  configureDiagnostics(app.getPath('userData'), appConfig.diagnostics.maxBytes)
  startupStep = 'clipboard'
  cleanupClipboardImages(app.getPath('userData'), appConfig.clipboardImages)
  startupStep = 'settings'
  settings = new SettingsStore(home, {
    userData: app.getPath('userData'), appData: app.getPath('appData'), maxBytes: appConfig.settings.maxBytes,
  })
  startupStep = 'theme'
  if (demoMode()) nativeTheme.themeSource = 'dark'
  else applyThemeSource(settings.data.theme)

  startupStep = 'shells'
  shellChoices = detectShells()
  if (!settings.data.lastShellId) settings.data.lastShellId = defaultShellId(shellChoices)

  startupStep = 'sessions'
  manager = new SessionManager({
    getWindow: currentWindow,
    settings,
    shells: shellChoices,
    home,
    notify,
    maxWriteChars: appConfig.terminal.maxWriteChars,
    statusPatternLimits: appConfig.statusPatterns,
  })

  nativeTheme.on('updated', () => {
    send('theme:system', nativeTheme.shouldUseDarkColors)
  })

  startupStep = 'permissions'
  denyRendererPermissions(session.defaultSession)
  startupStep = 'csp'
  installContentSecurityPolicy()
  startupStep = 'ipc'
  registerIpc()
  startupStep = 'menu'
  installMenu()
  startupStep = 'window'
  createWindow()
}

app.setName(APP_TITLE)
if (process.platform === 'win32') app.setAppUserModelId('it.plancia.comandi')

const gotLock = app.requestSingleInstanceLock()
startupTrace?.event('single-instance-lock', { acquired: gotLock, ready: app.isReady() })
if (!gotLock) {
  quitFor('single-instance-lock')
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
    startupTrace?.event('window-all-closed', { platform: process.platform, windows: BrowserWindow.getAllWindows().length })
    if (process.platform !== 'darwin') quitFor('window-all-closed')
  })
  app.on('child-process-gone', (_event, details) => {
    startupTrace?.event('child-process-gone', { type: details.type, reason: details.reason, exitCode: details.exitCode })
  })
  process.on('uncaughtException', (error) => {
    startupTrace?.event('uncaughtException', { name: error.name })
  })
  process.on('unhandledRejection', (reason) => {
    startupTrace?.event('unhandledRejection', { name: reason instanceof Error ? reason.name : 'non-error' })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('before-quit', () => {
    manager?.dispose()
  })

  app.whenReady().then(() => {
    startupStep = 'ready'
    start()
  }).catch((error: unknown) => {
    failStartup(error)
  })
}
