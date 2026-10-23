const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('board', {
  getState: () => ipcRenderer.invoke('get-state'),
  onState: (fn) => ipcRenderer.on('state', (_e, s) => fn(s)),
});
