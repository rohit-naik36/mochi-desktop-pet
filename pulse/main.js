// Mochi Pulse: the HR side of Mochi for Teams. A separate app from Mochi
// itself, so the people who use Mochi never have an HR view on their
// laptop. It shows team totals only (sample data until a company's real
// totals are connected).
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

app.setAppUserModelId('com.mochi.pulse');

// Base address of the Teams server's functions (see server/ADMIN.md).
const SERVER = '';

function open() {
  const win = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 420,
    minHeight: 500,
    title: 'Mochi Pulse',
    backgroundColor: '#f3f6fb',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  // The Teams server address; MOCHI_SERVER overrides it for testing.
  win.loadFile(path.join(__dirname, 'index.html'), { query: { server: process.env.MOCHI_SERVER || SERVER } });
  // Nothing inside the app navigates away or opens windows; links go to the browser.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Reports: HR picks where to save. Only a plain file name comes from the page.
const fileName = (name, ext) => String(name || 'Mochi Pulse').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').trim().slice(0, 80) + ext;
async function saveAs(e, name, ext, label) {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('documents'), fileName(name, ext)),
    filters: [{ name: label, extensions: [ext.slice(1)] }],
  });
  return canceled ? null : filePath;
}
ipcMain.handle('save-pdf', async (e, name) => {
  const file = await saveAs(e, name, '.pdf', 'PDF');
  if (!file) return false;
  // The page's print styles show only the report. The window's own tint
  // would show in the page margins, so print on white.
  const win = BrowserWindow.fromWebContents(e.sender);
  win.setBackgroundColor('#ffffff');
  let pdf;
  try { pdf = await e.sender.printToPDF({ pageSize: 'A4', printBackground: true }); } finally { win.setBackgroundColor('#f3f6fb'); }
  await fs.promises.writeFile(file, pdf);
  shell.openPath(file);
  return true;
});
ipcMain.handle('save-csv', async (e, name, text) => {
  const file = await saveAs(e, name, '.csv', 'CSV');
  if (!file) return false;
  await fs.promises.writeFile(file, '\ufeff' + String(text).slice(0, 1_000_000)); // BOM so Excel reads ₹ and Hindi
  shell.showItemInFolder(file);
  return true;
});

Menu.setApplicationMenu(null);
app.on('web-contents-created', (_e, wc) => wc.session.setPermissionRequestHandler((_wc, _p, cb) => cb(false)));
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
  app.whenReady().then(open);
  app.on('window-all-closed', () => app.quit());
}
