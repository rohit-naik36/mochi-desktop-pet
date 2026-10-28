const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('play', {
  getState: () => ipcRenderer.invoke('get-state'),
  reward: (delta) => ipcRenderer.send('play-reward', delta),
  strike: () => ipcRenderer.invoke('profanity-strike'),
  hide: () => ipcRenderer.send('pet-hide'),
  done: (x, y) => ipcRenderer.send('play-done', x, y),
  capture: (on) => ipcRenderer.send('play-capture', !!on),
  track: (event, n) => ipcRenderer.send('track', event, n),
  insight: (kind, value) => ipcRenderer.send('insight', kind, value),
  aiReply: (req) => ipcRenderer.invoke('ai-reply', req),
  jar: (text) => ipcRenderer.send('jar-add', text),
  onAchievement: (fn) => ipcRenderer.on('achievement', (_e, id) => fn(id)),
});
