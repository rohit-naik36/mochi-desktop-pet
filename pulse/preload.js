// The only things the Pulse page can ask of the app: save a report as a PDF
// or a CSV file where HR chooses.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pulseApp', {
  savePdf: (name) => ipcRenderer.invoke('save-pdf', name),
  saveCsv: (name, text) => ipcRenderer.invoke('save-csv', name, text),
});
