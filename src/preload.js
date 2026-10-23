const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  onState: (fn) => ipcRenderer.on('state', (_e, s) => fn(s)),
  onAction: (fn) => ipcRenderer.on('action', (_e, a) => fn(a)),
  mouseOverPet: (over) => ipcRenderer.send('mouse-over-pet', over),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: () => ipcRenderer.send('drag-move'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  moveTo: (x, y) => ipcRenderer.send('move-to', x, y),
  moveBy: (dx, dy) => ipcRenderer.send('move-by', dx, dy),
  getBounds: () => ipcRenderer.invoke('get-bounds'),
  dragDone: () => ipcRenderer.send('drag-done'),
  contextMenu: () => ipcRenderer.send('context-menu'),
  save: (partial) => ipcRenderer.send('save-state', partial),
});
