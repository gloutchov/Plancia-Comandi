const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const [project, root, port] = process.argv.slice(2)
for (const [name, dir] of Object.entries({ home: 'home', appData: 'app-data', userData: 'user-data', sessionData: 'session-data' })) {
  app.setPath(name, path.join(root, dir))
}
app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1')
app.commandLine.appendSwitch('remote-debugging-port', port)
const query = '\x1b[c\x1b]10;?\x07\x1b]11;?\x1b\\'
// Geometry/focus smoke also covers a full grid and a session outside that grid.
const sessionCount = process.argv[5] === '5' ? 5 : 3
// External M31 fixture only: native chrome and position evidence, never packaged.
const windowChrome = ['window-chrome', 'window-chrome-hidden'].includes(process.argv[6])
const sessions = Array.from({ length: sessionCount }, (_, i) => i + 1).map(index => ({
  id: `00000000-0000-4000-8000-00000000000${index}`, index, name: `Synthetic ${index}`,
  autoName: false, shellId: 'synthetic', labelKey: 'shellPowerShell', cwd: root,
  pid: null, phase: 'idle', reason: 'quiet', badge: false, exitCode: null, createdAt: 0,
}))
let settings = {
  locale: 'it', theme: 'dark', layout: 'single', fontSize: 13,
  notifyDesktop: false, notifyBadge: false, showReasons: false,
  lastShellId: 'synthetic', lastCwd: root, status: {},
}
const streams = new Map(sessions.map(s => [s.id, { seq: 1, data: `READY ${s.index}\r\n${query}` }]))
const writes = []
const subscriptions = []
const resizes = []
let win
ipcMain.handle('probe:boot', () => ({
  platform: process.platform, home: root, version: 'fixture', demo: false, systemDark: true,
  settings, sessions, shells: [], limits: { maxPasteChars: 200000, maxDroppedFiles: 100, maxPathChars: 32768 },
}))
ipcMain.handle('probe:subscribe', (_event, id) => {
  subscriptions.push(id)
  return streams.get(id) ?? { seq: 0, data: '' }
})
ipcMain.on('probe:write', (_event, id, data) => writes.push({ id, data }))
ipcMain.on('probe:resize', (_event, id, cols, rows) => resizes.push({ id, cols, rows }))
ipcMain.handle('probe:settings', (_event, patch) => {
  settings = { ...settings, ...patch }
  win.webContents.send('probe:settings', settings)
  return settings
})
ipcMain.handle('probe:report', () => ({ writes, subscriptions, resizes }))
ipcMain.handle('probe:process-warning', (_event, value) => {
  for (const session of sessions) session.processDetectionUnavailable = value === true
  win.webContents.send('probe:sessions', sessions)
})
ipcMain.handle('probe:emit', (_event, id, data) => {
  const stream = streams.get(id)
  stream.data += data
  stream.seq += 1
  win.webContents.send('probe:data', { id, seq: stream.seq, data })
})
ipcMain.handle('probe:remove', (_event, id) => {
  const index = sessions.findIndex(s => s.id === id)
  if (index >= 0) sessions.splice(index, 1)
  win.webContents.send('probe:sessions', sessions)
})
app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 1280, height: 820, show: process.argv[6] !== 'window-chrome-hidden',
    ...(windowChrome ? { minWidth: 860, minHeight: 560 } : {}),
    ...(windowChrome && process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 18 } } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'terminal-stream-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false,
    },
  })
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  win.webContents.session.setPermissionCheckHandler(() => false)
  if (windowChrome) {
    const positions = []
    const record = () => {
      if (win.isDestroyed()) return
      positions.push({ bounds: win.getBounds(), minimized: win.isMinimized(), maximized: win.isMaximized(), fullscreen: win.isFullScreen() })
      if (positions.length > 1000) positions.shift()
      fs.writeFileSync(path.join(root, 'native-window.json'), JSON.stringify(positions, null, 2))
    }
    for (const event of ['move', 'resize', 'minimize', 'restore', 'enter-full-screen', 'leave-full-screen']) win.on(event, record)
    record()
  }
  await win.loadFile(path.join(project, 'dist', 'index.html'))
})
app.on('window-all-closed', () => app.quit())
