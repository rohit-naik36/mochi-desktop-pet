const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('play', {
  getState: () => ipcRenderer.invoke('get-state'),
  reward: (delta) => ipcRenderer.send('play-reward', delta),
  strike: () => ipcRenderer.invoke('profanity-strike'),
  hide: () => ipcRenderer.send('pet-hide'),
  done: (x, y) => ipcRenderer.send('play-done', x, y),
  track: (event, n) => ipcRenderer.send('track', event, n),
  insight: (kind, value) => ipcRenderer.send('insight', kind, value),
  jar: (text) => ipcRenderer.send('jar-add', text),
  onAchievement: (fn) => ipcRenderer.on('achievement', (_e, id) => fn(id)),
});
