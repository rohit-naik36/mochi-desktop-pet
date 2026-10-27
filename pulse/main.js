// Mochi Pulse: the HR side of Mochi for Teams. A separate app from Mochi
// itself, so the people who use Mochi never have an HR view on their
// laptop. It shows team totals only (sample data until a company's real
// totals are connected).
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

app.setAppUserModelId('com.mochi.pulse');

function open() {
  const win = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 420,
    minHeight: 500,
    title: 'Mochi Pulse',
    backgroundColor: '#f3f6fb',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  // Nothing inside the app navigates away or opens windows; links go to the browser.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

Menu.setApplicationMenu(null);
app.on('web-contents-created', (_e, wc) => wc.session.setPermissionRequestHandler((_wc, _p, cb) => cb(false)));
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
  app.whenReady().then(open);
  app.on('window-all-closed', () => app.quit());
}
