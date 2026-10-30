const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tour', {
  steps: () => ipcRenderer.invoke('demo-steps'),
  run: (id) => ipcRenderer.invoke('demo-run', id),
  onRestart: (fn) => ipcRenderer.on('demo-restart', () => fn()),
});
