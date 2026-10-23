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
  y: null,
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
    y: state.y ?? wa.y + wa.height - WIN_H,
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
  if (!process.env.MOCHI_DEBUG) win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'pet.html'));
  win.webContents.on('did-finish-load', () => win.webContents.send('state', state));
}

let playWin = null;

function openPlay(game) {
  if (playWin && !playWin.isDestroyed()) { playWin.focus(); return; }
  const wa = workArea();
  const W = 560, H = 480;
  playWin = new BrowserWindow({
    width: W,
    height: H,
    x: Math.round(wa.x + (wa.width - W) / 2),
    y: Math.round(wa.y + (wa.height - H) / 2),
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    title: `Play with ${state.name}`,
    webPreferences: {
      preload: path.join(__dirname, 'play-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  playWin.loadFile(path.join(__dirname, 'play.html'), game ? { query: { game } } : undefined);
  if (process.env.MOCHI_DEBUG) playWin.webContents.on('did-finish-load', () => console.log('play room loaded'));
  playWin.webContents.on('console-message', (_e, level, msg) => process.env.MOCHI_DEBUG && level >= 2 && console.log('play error:', msg));
  playWin.on('closed', () => { playWin = null; send('action', 'play-closed'); });
  send('action', 'play-opened');
}

ipcMain.handle('get-state', () => state);
ipcMain.on('close-play', () => playWin && playWin.close());
// Games report happiness gains; the desktop pet applies and saves them.
ipcMain.on('play-reward', (_e, delta, line) => send('reward', { delta, line }));

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
    { label: 'Play', submenu: [
      { label: 'Open play room', click: () => openPlay() },
      { type: 'separator' },
      { label: 'Breathe with me', click: () => openPlay('breathe') },
      { label: 'Bubble pop', click: () => openPlay('bubbles') },
      { label: 'Chase the light', click: () => openPlay('chase') },
      { label: 'Feed it a worry', click: () => openPlay('worry') },
    ] },
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
    { label: 'Bring pet back', click: () => { const wa = workArea(); placeAt(wa.x + wa.width - WIN_W - 40, wa.y + wa.height - WIN_H); } },
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
  if (!win || process.env.MOCHI_DEBUG) return;
  win.setIgnoreMouseEvents(!over, { forward: true });
});

// All moves go through placeAt so the window keeps its exact size. On Windows
// with display scaling, setPosition alone lets the size creep by a pixel each
// call, which slowly pushed the pet down behind the taskbar.
function placeAt(x, y) {
  const wa = screen.getDisplayNearestPoint({ x: x + WIN_W / 2, y: y + WIN_H / 2 }).workArea;
  const nx = Math.min(Math.max(Math.round(x), wa.x - 40), wa.x + wa.width - WIN_W + 40);
  const ny = Math.min(Math.max(Math.round(y), wa.y - 40), wa.y + wa.height - WIN_H);
  win.setBounds({ x: nx, y: ny, width: WIN_W, height: WIN_H });
}


// Wandering sends absolute positions so slow sub-pixel drift isn't lost to rounding.
ipcMain.on('move-to', (_e, x, y) => placeAt(x, y));

ipcMain.on('move-by', (_e, dx, dy) => {
  const { x, y } = win.getBounds();
  placeAt(x + dx, y + dy);
});

// Dragging follows the real cursor position, so rounding never adds up.
let dragOffset = null;
ipcMain.on('drag-start', () => {
  const c = screen.getCursorScreenPoint();
  const { x, y } = win.getBounds();
  dragOffset = { x: c.x - x, y: c.y - y };
});
ipcMain.on('drag-move', () => {
  if (!dragOffset) return;
  const c = screen.getCursorScreenPoint();
  placeAt(c.x - dragOffset.x, c.y - dragOffset.y);
});
ipcMain.on('drag-end', () => { dragOffset = null; });

ipcMain.on('open-play', (_e, game) => openPlay(game));

ipcMain.on('context-menu', () => buildMenu().popup({ window: win }));

ipcMain.handle('get-bounds', () => {
  const bounds = win.getBounds();
  const wa = screen.getDisplayMatching(bounds).workArea;
  return { win: bounds, workArea: wa };
});

// After a drag the pet stays exactly where it was dropped (pulled back on screen if needed).
ipcMain.on('drag-done', () => {
  const { x, y } = win.getBounds();
  placeAt(x, y);
  if (process.env.MOCHI_DEBUG) console.log('dropped at', JSON.stringify(win.getBounds()));
});

ipcMain.on('save-state', (_e, partial) => {
  Object.assign(state, partial);
  ({ x: state.x, y: state.y } = win.getBounds());
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
    const keepOnScreen = () => { const { x, y } = win.getBounds(); placeAt(x, y); };
    screen.on('display-metrics-changed', keepOnScreen);
    screen.on('display-removed', keepOnScreen);
    keepOnScreen(); // also rescues a pet saved somewhere off screen
    if (process.env.MOCHI_DEBUG) setTimeout(() => openPlay('bubbles'), 3000);
    // Tray label shows live stats, so refresh it now and then.
    setInterval(refreshTrayMenu, 60_000);
  });
  app.on('before-quit', saveState);
  app.on('window-all-closed', () => app.quit());
}
