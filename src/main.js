// Mochi: a tiny desktop pet that keeps you company while you work.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const I18N = require('./i18n');
const Progress = require('./progress');

const MIN_MS = 60_000;
const WIN_W = 220;
const WIN_H = 260; // room above the pet for speech bubbles

let win;
let tray;
let state;
const statePath = () => path.join(app.getPath('userData'), 'pet-state.json');

const SKINS = [
  { id: 'smoke', name: 'Mochi', label: 'Mochi (shy and sweet)' },
  { id: 'cinder', name: 'Cinder', label: 'Cinder (hype coach)' },
  { id: 'mist', name: 'Mist', label: 'Mist (calm and wise)' },
  { id: 'dusk', name: 'Dusk', label: 'Dusk (starry night owl)' },
  { id: 'hope', name: 'Hope', label: 'Hope (warm and hopeful)' },
];

const defaults = {
  userName: null, // asked on first run
  petGender: null, // 'male' | 'female' | 'nonbinary', asked after the name
  lang: 'en',
  strikes: { count: 0, at: 0 }, // swearing at the pet
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
  stats: null, // points, counts, streak days, badges (see progress.js)
  moods: {}, // 'YYYY-MM-DD' -> 1..5
  gratitude: [], // [{ d: 'YYYY-MM-DD', t: 'text' }]
  focusUntil: 0, // end of the current focus session, if any
  schedule: 'day', // 'day' = sleeps at bedtime, 'night' = night shifts, sleeps when you do
  bedtime: 23, // hour Mochi goes to bed on the day schedule
  wakeTime: 7,
  sleepLog: [], // [{ from, to }] your recent long breaks, to learn a night shifter's hours
  askedNight: '', // night we last asked "still up?" (the evening's date)
  stayUp: '', // night the user asked Mochi to stay up with them
};

function loadState() {
  try {
    state = { ...defaults, ...JSON.parse(fs.readFileSync(statePath(), 'utf8')) };
    state.nudges = { ...defaults.nudges, ...state.nudges };
  } catch {
    state = { ...defaults };
  }
  state.stats = { ...Progress.fresh(), ...(state.stats || {}) };
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
      sandbox: true,
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
const PET_CX = WIN_W / 2;   // pet centre inside the pet window
const PET_CY = WIN_H - 61;

// Play mode: a transparent layer over the whole work area. The desktop pet
// hides and the same buddy appears in the layer at the same spot.
function openPlay(game) {
  if (hidingUntil) return;
  if (playWin && !playWin.isDestroyed()) { playWin.focus(); return; }
  const pb = win.getBounds();
  const wa = screen.getDisplayMatching(pb).workArea;
  playWin = new BrowserWindow({
    x: wa.x,
    y: wa.y,
    width: wa.width,
    height: wa.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    title: `Play with ${state.name}`,
    webPreferences: {
      preload: path.join(__dirname, 'play-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  playWin.setAlwaysOnTop(true, 'screen-saver');
  const query = { px: String(pb.x - wa.x + PET_CX), py: String(pb.y - wa.y + PET_CY) };
  if (game) query.game = game;
  playWin.loadFile(path.join(__dirname, 'play.html'), { query });
  playWin.once('ready-to-show', () => playWin.focus());
  playWin.webContents.once('did-finish-load', () => {
    win.hide();
    if (process.env.MOCHI_DEBUG) console.log('play room loaded');
  });
  playWin.webContents.on('console-message', (_e, level, msg) => process.env.MOCHI_DEBUG && level >= 2 && console.log('play error:', msg));
  playWin.on('closed', () => {
    playWin = null;
    if (hidingUntil) return; // stays hidden until it's ready to come back
    win.showInactive();
    send('action', 'play-closed');
  });
  playWin._wa = wa;
}

ipcMain.handle('get-state', () => state);

// ---------- points and badges ----------

// Any window reports an activity here; new badges are announced by the pet
// (or in the play layer if it's open) and the board refreshes.
ipcMain.on('track', (_e, event, n = 1) => {
  const unlocked = Progress.record(state.stats, event, n);
  saveState();
  for (const id of unlocked) {
    send('achievement', id);
    if (playWin && !playWin.isDestroyed()) playWin.webContents.send('achievement', id);
  }
  if (boardWin && !boardWin.isDestroyed()) boardWin.webContents.send('state', state);
  if (unlocked.length) refreshTrayMenu();
});

// Good news from Feed me a worry, saved to the gratitude jar.
ipcMain.on('jar-add', (_e, text) => {
  const t = String(text || '').trim().slice(0, 120);
  if (!t) return;
  state.gratitude = [...(state.gratitude || []), { d: Progress.dayKey(), t }].slice(-365);
  send('state', state);
  ipcMain.emit('track', null, 'gratitude');
});

let boardWin = null;
function openBoard() {
  if (boardWin && !boardWin.isDestroyed()) { boardWin.show(); boardWin.focus(); return; }
  boardWin = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 420,
    minHeight: 500,
    title: I18N.t(state.lang, 'board.title', { pet: state.name }),
    backgroundColor: '#17171f',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'board-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  boardWin.setMenu(null);
  boardWin.loadFile(path.join(__dirname, 'board.html'));
  boardWin.on('closed', () => { boardWin = null; });
  if (process.env.MOCHI_DEBUG) {
    boardWin.webContents.once('did-finish-load', () => console.log('board loaded'));
    boardWin.webContents.on('console-message', (_e, level, msg) => level >= 2 && console.log('board error:', msg));
  }
}

// Swearing at the pet: count strikes (forgotten after a day); the third one sends it into hiding.
const HIDE_MIN = 5;
let hidingUntil = 0;
ipcMain.handle('profanity-strike', () => {
  const s = state.strikes || { count: 0, at: 0 };
  if (Date.now() - s.at > 24 * 60 * 60 * 1000) s.count = 0;
  s.count += 1;
  s.at = Date.now();
  state.strikes = s;
  saveState();
  return s.count;
});
ipcMain.on('pet-hide', () => {
  state.strikes = { count: 0, at: Date.now() };
  hidingUntil = Date.now() + HIDE_MIN * MIN_MS;
  saveState();
  if (playWin) playWin.close();
  win.hide();
  refreshTrayMenu();
  tray.setToolTip(I18N.t(state.lang, 'menu.hidingNow', { pet: state.name, gender: state.petGender }));
  setTimeout(() => {
    hidingUntil = 0;
    win.showInactive();
    tray.setToolTip(`${state.name} the desktop pet`);
    refreshTrayMenu();
    send('action', 'back-from-hiding');
  }, HIDE_MIN * MIN_MS);
});
// The buddy comes back to the desktop wherever play left it.
ipcMain.on('play-done', (_e, x, y) => {
  if (!playWin) return;
  const wa = playWin._wa;
  placeAt(wa.x + x - PET_CX, wa.y + y - PET_CY);
  state.x = win.getBounds().x; state.y = win.getBounds().y;
  saveState();
  playWin.close();
});
// Games report happiness gains; the desktop pet applies and saves them.
ipcMain.on('play-reward', (_e, delta) => send('reward', { delta }));

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
  const M = (key, count) => I18N.t(state.lang, 'menu.' + key, { name: state.userName, pet: state.name, gender: state.petGender, count });
  const toggle = (key, label) => ({
    label,
    type: 'checkbox',
    checked: state.nudges[key],
    click: (item) => { state.nudges[key] = item.checked; saveState(); send('state', state); },
  });
  if (hidingUntil) {
    return Menu.buildFromTemplate([
      { label: M('hidingNow'), enabled: false },
      { type: 'separator' },
      { label: M('quit'), click: () => app.quit() },
    ]);
  }
  return Menu.buildFromTemplate([
    { label: `${state.name}  ❤ ${Math.round(state.happiness)}  🍙 ${Math.round(100 - state.hunger)}  ⭐ ${state.stats.points}`, enabled: false },
    { label: M('board'), click: openBoard },
    { type: 'separator' },
    state.focusUntil > Date.now()
      ? { label: M('focusStop', Math.ceil((state.focusUntil - Date.now()) / MIN_MS)), click: () => send('action', 'focus-stop') }
      : { label: M('focus'), submenu: [25, 50].map((m) => ({ label: M('focusMin', m), click: () => send('action', 'focus-' + m) })) },
    { label: M('mood'), click: () => send('action', 'mood') },
    { label: M('gratitude'), click: () => send('action', 'gratitude') },
    { type: 'separator' },
    { label: M('feed'), click: () => send('action', 'feed') },
    { label: M('play'), submenu: [
      { label: M('playTime'), click: () => openPlay() },
      { type: 'separator' },
      { label: M('breathe'), click: () => openPlay('breathe') },
      { label: M('bubbles'), click: () => openPlay('bubbles') },
      { label: M('chase'), click: () => openPlay('chase') },
    ] },
    { label: M('worry'), click: () => openPlay('worry') },
    { label: M('nap'), click: () => send('action', 'sleep') },
    { label: M('schedule'), submenu: [
      ...[22, 23, 0, 1].map((h) => ({
        label: M('bedAt', I18N.hourLabel(state.lang, h)),
        type: 'radio',
        checked: state.schedule !== 'night' && state.bedtime === h,
        click: () => setSchedule('day', h),
      })),
      { type: 'separator' },
      { label: M('nightShift'), type: 'radio', checked: state.schedule === 'night', click: () => setSchedule('night') },
    ] },
    { label: M('buddy'), submenu: SKINS.map((sk) => ({
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
    { label: state.userName ? M('changeName') : M('name'), click: () => send('action', 'ask-name') },
    { label: M('gender'), submenu: ['male', 'female', 'nonbinary'].map((g) => ({
      label: I18N.t(state.lang, 'gender.' + g),
      type: 'radio',
      checked: state.petGender === g,
      click: () => { state.petGender = g; saveState(); refreshTrayMenu(); send('state', state); send('action', 'gender-changed'); },
    })) },
    { label: M('language'), submenu: I18N.LANGS.map((l) => ({
      label: l.label,
      type: 'radio',
      checked: state.lang === l.id,
      click: () => { state.lang = l.id; saveState(); refreshTrayMenu(); send('state', state); send('action', 'switched'); },
    })) },
    { label: M('wander'), type: 'checkbox', checked: state.walking,
      click: (i) => { state.walking = i.checked; saveState(); send('state', state); } },
    { type: 'separator' },
    { label: M('reminders'), submenu: [
      toggle('water', M('water', state.waterEveryMin)),
      toggle('stretch', M('stretch', state.stretchEveryMin)),
      toggle('eyes', M('eyes', state.eyesEveryMin)),
    ] },
    // Store (MSIX) builds can't register to start with Windows this way.
    ...(process.windowsStore ? [] : [{ label: M('startup'), type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) }]),
    { type: 'separator' },
    { label: M('bringBack'), click: () => { const wa = workArea(); placeAt(wa.x + wa.width - WIN_W - 40, wa.y + wa.height - WIN_H); } },
    { label: M('quit'), click: () => app.quit() },
  ]);
}

function setSchedule(schedule, bedtime = state.bedtime) {
  Object.assign(state, { schedule, bedtime, stayUp: '' });
  saveState();
  refreshTrayMenu();
  send('state', state);
  send('action', 'schedule-changed');
}

// Tell the pet how long since the last mouse or keyboard input, so it can
// doze off while you're away and greet you when you're back. Only the number
// of idle seconds is read, never what you type or where you click.
function reportActivity() {
  const idle = process.env.MOCHI_DEBUG_IDLE ? +process.env.MOCHI_DEBUG_IDLE : powerMonitor.getSystemIdleTime();
  send('activity', idle);
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

// Smooth glide used when Mochi gets upset and floats to the middle, and back.
let glideTimer = null;
function glide(tx, ty, ms = 1100) {
  clearInterval(glideTimer);
  const { x: sx, y: sy } = win.getBounds();
  const t0 = Date.now();
  glideTimer = setInterval(() => {
    const t = Math.min(1, (Date.now() - t0) / ms);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    placeAt(sx + (tx - sx) * e, sy + (ty - sy) * e);
    if (t === 1) clearInterval(glideTimer);
  }, 16);
}

let upsetHome = null;
ipcMain.on('glide-center', () => {
  if (playWin) return;
  const b = win.getBounds();
  upsetHome = upsetHome || { x: b.x, y: b.y };
  const wa = screen.getDisplayMatching(b).workArea;
  win.setAlwaysOnTop(true, 'screen-saver');
  win.moveTop();
  glide(wa.x + (wa.width - WIN_W) / 2, wa.y + (wa.height - WIN_H) / 2);
});
ipcMain.on('glide-home', () => {
  if (!upsetHome) return;
  glide(upsetHome.x, upsetHome.y);
  upsetHome = null;
});
ipcMain.on('focus-pet', () => win.focus());

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
  if (!upsetHome) ({ x: state.x, y: state.y } = win.getBounds()); // not the temporary centre spot
  saveState();
  refreshTrayMenu();
  if (boardWin && !boardWin.isDestroyed()) boardWin.webContents.send('state', state);
});

// Security: every window shows only Mochi's own local pages. No links open,
// no navigation away, no pop-ups, no permission prompts (camera, mic...).
app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (e) => e.preventDefault());
  contents.session.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
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
    if (process.env.MOCHI_DEBUG) setTimeout(() => openPlay(process.env.MOCHI_DEBUG_GAME || 'bubbles'), 3000);
    if (process.env.MOCHI_DEBUG_BOARD) setTimeout(openBoard, 2000);
    // Tray label shows live stats, so refresh it now and then.
    setInterval(refreshTrayMenu, 60_000);
    setInterval(reportActivity, 15_000);
    powerMonitor.on('resume', reportActivity);
    powerMonitor.on('unlock-screen', reportActivity);
  });
  app.on('before-quit', saveState);
  app.on('window-all-closed', () => app.quit());
}
