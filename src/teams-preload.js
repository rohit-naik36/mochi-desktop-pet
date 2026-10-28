const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('teams', {
  get: () => ipcRenderer.invoke('teams-get'),
  join: (code) => ipcRenderer.invoke('teams-join', code),
  set: (partial) => ipcRenderer.send('teams-set', partial),
  leave: () => ipcRenderer.send('teams-leave'),
  answer: (id, a) => ipcRenderer.send('company-answer', id, a),
  askNow: (id, change) => ipcRenderer.send('company-ask-now', id, !!change),
  onChange: (fn) => ipcRenderer.on('teams', (_e, v) => fn(v)),
});
