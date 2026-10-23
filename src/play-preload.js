const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('play', {
  getState: () => ipcRenderer.invoke('get-state'),
  reward: (delta, line) => ipcRenderer.send('play-reward', delta, line),
  close: () => ipcRenderer.send('close-play'),
});
