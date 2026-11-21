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
  onFocus: noSubscription,
  onEditCommand: callback => on('probe:edit', data => {
    Promise.resolve(callback(data.command, data.id, data.accelerator)).then(handled => {
      ipcRenderer.send('probe:edit-result', { id: data.id, handled: handled === true })
    })
  }),
  writeClipboard: async () => true,
  readClipboardText: () => ipcRenderer.invoke('probe:clipboard-text'),
  readClipboardImage: () => ipcRenderer.invoke('probe:clipboard-image'),
})
contextBridge.exposeInMainWorld('terminalProbe', {
  report: () => ipcRenderer.invoke('probe:report'),
  emit: (id, data) => ipcRenderer.invoke('probe:emit', id, data),
  remove: id => ipcRenderer.invoke('probe:remove', id),
  processWarning: value => ipcRenderer.invoke('probe:process-warning', value),
  clipboard: value => ipcRenderer.invoke('probe:clipboard-set', value),
  edit: (id, accelerator = false) => ipcRenderer.invoke('probe:edit', { id, accelerator }),
  name: (id, name) => ipcRenderer.invoke('probe:name', id, name),
})
