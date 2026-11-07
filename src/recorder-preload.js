const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('recorder', {
  onStart: (fn) => ipcRenderer.on('rec-start', () => fn()),
  onStop: (fn) => ipcRenderer.on('rec-stop', () => fn()),
  done: (samples) => ipcRenderer.send('rec-done', samples),
  error: (code) => ipcRenderer.send('rec-error', code),
});
