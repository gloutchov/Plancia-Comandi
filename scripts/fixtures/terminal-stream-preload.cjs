const { contextBridge, ipcRenderer } = require('electron')
const on = (channel, callback) => {
  const listener = (_event, data) => callback(data)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}
const noSubscription = () => () => {}
contextBridge.exposeInMainWorld('plancia', {
  boot: () => ipcRenderer.invoke('probe:boot'),
  subscribe: id => ipcRenderer.invoke('probe:subscribe', id),
  write: (id, data) => ipcRenderer.send('probe:write', id, data),
  resize: (id, cols, rows) => ipcRenderer.send('probe:resize', id, cols, rows),
  updateSettings: patch => ipcRenderer.invoke('probe:settings', patch),
  setWatching: () => {},
  onData: callback => on('probe:data', callback),
  onSessions: callback => on('probe:sessions', callback),
  onSettings: callback => on('probe:settings', callback),
  onSettingsWarning: noSubscription, onSystemTheme: noSubscription,
  onFocus: noSubscription, onEditCommand: noSubscription,
  writeClipboard: async () => true, readClipboardText: async () => 'synthetic paste',
  readClipboardImage: async () => null,
})
contextBridge.exposeInMainWorld('terminalProbe', {
  report: () => ipcRenderer.invoke('probe:report'),
  emit: (id, data) => ipcRenderer.invoke('probe:emit', id, data),
  remove: id => ipcRenderer.invoke('probe:remove', id),
  processWarning: value => ipcRenderer.invoke('probe:process-warning', value),
})
