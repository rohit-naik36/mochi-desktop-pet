const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('teams', {
  get: () => ipcRenderer.invoke('teams-get'),
  join: (code) => ipcRenderer.invoke('teams-join', code),
  set: (partial) => ipcRenderer.send('teams-set', partial),
  leave: () => ipcRenderer.send('teams-leave'),
  onChange: (fn) => ipcRenderer.on('teams', (_e, v) => fn(v)),
});
