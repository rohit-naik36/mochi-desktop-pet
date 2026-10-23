// Mochi: a tiny desktop pet that keeps you company while you work.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const WIN_W = 220;
const WIN_H = 210;

let win;
let tray;
let state;
const statePath = () => path.join(app.getPath('userData'), 'pet-state.json');

const SKINS = [
  { id: 'smoke', name: 'Mochi', label: 'Mochi (black smoke)' },
  { id: 'cinder', name: 'Cinder', label: 'Cinder (ember smoke)' },
  { id: 'mist', name: 'Mist', label: 'Mist (silver fog)' },
  { id: 'dusk', name: 'Dusk', label: 'Dusk (starry smoke)' },
];

const defaults = {
  skin: 'smoke',
  name: 'Mochi',
  happiness: 80,
  hunger: 20,
  energy: 90,
  nudges: { water: true, stretch: true, eyes: true },
  waterEveryMin: 45,
  stretchEveryMin: 60,
  eyesEveryMin: 20,
  walking: true,
  x: null,
  lastSeen: Date.now(),
};

function loadState() {
  try {
    state = { ...defaults, ...JSON.parse(fs.readFileSync(statePath(), 'utf8')) };
    state.nudges = { ...defaults.nudges, ...state.nudges };
  } catch {
    state = { ...defaults };
  }
}

function saveState() {
  state.lastSeen = Date.now();
  try { fs.writeFileSync(statePath(), JSON.stringify(state, null, 2)); } catch {}
}

function workArea() {
  return screen.getPrimaryDisplay().workArea;
}

function createWindow() {
  const wa = workArea();
  const x = state.x ?? wa.x + wa.width - WIN_W - 40;
  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x,
    y: wa.y + wa.height - WIN_H,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);
  // Clicks pass through empty space until the pointer is over the pet.
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'pet.html'));
  win.webContents.on('did-finish-load', () => win.webContents.send('state', state));
}

function trayIcon() {
  const p = path.join(__dirname, 'icon.png');
  const img = nativeImage.createFromPath(p);
  return img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: 16, height: 16 });
}

function buildTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip(`${state.name} the desktop pet`);
  refreshTrayMenu();
  tray.on('click', () => send('action', 'pet'));
}

function buildMenu() {
  const toggle = (key, label) => ({
    label,
    type: 'checkbox',
    checked: state.nudges[key],
    click: (item) => { state.nudges[key] = item.checked; saveState(); send('state', state); },
  });
  return Menu.buildFromTemplate([
    { label: `${state.name}  ❤ ${Math.round(state.happiness)}  🍙 ${Math.round(100 - state.hunger)}`, enabled: false },
    { type: 'separator' },
    { label: 'Feed', click: () => send('action', 'feed') },
    { label: 'Play', click: () => send('action', 'play') },
    { label: 'Nap time', click: () => send('action', 'sleep') },
    { label: 'Choose your buddy', submenu: SKINS.map((sk) => ({
      label: sk.label,
      type: 'radio',
      checked: state.skin === sk.id,
      click: () => {
        state.skin = sk.id;
        state.name = sk.name;
        saveState();
        tray.setToolTip(`${state.name} the desktop pet`);
        refreshTrayMenu();
        send('state', state);
        send('action', 'switched');
      },
    })) },
    { label: 'Let it wander', type: 'checkbox', checked: state.walking,
      click: (i) => { state.walking = i.checked; saveState(); send('state', state); } },
    { type: 'separator' },
    { label: 'Reminders', submenu: [
      toggle('water', `Drink water (every ${state.waterEveryMin} min)`),
      toggle('stretch', `Stretch break (every ${state.stretchEveryMin} min)`),
      toggle('eyes', `20-20-20 eye rest (every ${state.eyesEveryMin} min)`),
    ] },
    { label: 'Start with Windows', type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) },
    { type: 'separator' },
    { label: 'Bring pet back', click: () => { const wa = workArea(); win.setPosition(wa.x + wa.width - WIN_W - 40, wa.y + wa.height - WIN_H); } },
    { label: 'Quit', click: () => app.quit() },
  ]);
}

function refreshTrayMenu() {
  tray.setContextMenu(buildMenu());
}

function send(ch, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(ch, payload);
}

// Renderer asks to toggle click-through as the pointer enters or leaves the pet.
ipcMain.on('mouse-over-pet', (_e, over) => {
  if (!win) return;
  win.setIgnoreMouseEvents(!over, { forward: true });
});

// Drag and walk both move the window; keep the pet on screen.
ipcMain.on('move-by', (_e, dx, dy) => {
  const [x, y] = win.getPosition();
  const b = screen.getDisplayMatching(win.getBounds()).bounds;
  const nx = Math.min(Math.max(x + Math.round(dx), b.x - 40), b.x + b.width - WIN_W + 40);
  const ny = Math.min(Math.max(y + Math.round(dy), b.y - 40), b.y + b.height - WIN_H + 20);
  win.setPosition(nx, ny);
});

ipcMain.on('context-menu', () => buildMenu().popup({ window: win }));

ipcMain.handle('get-bounds', () => {
  const bounds = win.getBounds();
  const wa = screen.getDisplayMatching(bounds).workArea;
  return { win: bounds, workArea: wa };
});

ipcMain.on('drop-to-floor', () => {
  const [x] = win.getPosition();
  const wa = screen.getDisplayMatching(win.getBounds()).workArea;
  win.setPosition(x, wa.y + wa.height - WIN_H);
});

ipcMain.on('save-state', (_e, partial) => {
  Object.assign(state, partial);
  state.x = win.getPosition()[0];
  saveState();
  refreshTrayMenu();
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => send('action', 'pet'));
  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('com.mochi.desktoppet');
    loadState();
    createWindow();
    buildTray();
    // Tray label shows live stats, so refresh it now and then.
    setInterval(refreshTrayMenu, 60_000);
  });
  app.on('before-quit', saveState);
  app.on('window-all-closed', () => app.quit());
}
