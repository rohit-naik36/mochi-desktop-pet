const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('play', {
  getState: () => ipcRenderer.invoke('get-state'),
  reward: (delta) => ipcRenderer.send('play-reward', delta),
  done: (x, y) => ipcRenderer.send('play-done', x, y),
});
