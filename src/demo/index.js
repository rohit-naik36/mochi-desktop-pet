// Mochi Demo: the guided tour for client demos. Loaded only by the demo app
// (src/demo-flag.js); normal and Store builds leave this folder out.
//
// Everything the tour shows is the real app code. Only two triggers are
// pretended, because they depend on the machine: a call starting (the call
// check) and the keyboard and mouse going quiet (the idle check). Nothing is
// ever sent: the demo company never talks to a server.
const path = require('path');
const fs = require('fs');
const { STEPS, SAMPLE_WORRY } = require('./steps');
const { seedWeek } = require('./seed');

const CALL_MS = 40_000;          // long enough to count as a one-minute call
const BREAK_WINDOW_MS = 3 * 60_000; // how long "the keyboard went quiet" stays true

let ctx = null;
let tourWin = null;
let pulseWin = null;
let callOn = false;
let worryArmed = false;

// The sample worry, only for the one time the tour opens Feed me a worry.
function worryText() { return worryArmed ? SAMPLE_WORRY : ''; }

function ensureJoined() {
  const s = ctx.getState();
  if (s.teams && !s.teams.demo) return { ok: false, note: 'This laptop is joined to a real company. Choose Reset demo from the Mochi menu first.' };
  if (!s.teams) ctx.joinCompany(ctx.Company.lookup(ctx.Company.DEMO_CODE));
  ctx.warmAi();
  return { ok: true };
}

const steps = {
  async meet() {
    ctx.send('action', 'pet');
    return { ok: true, note: 'Say hello, then go on.' };
  },

  async join() {
    const s = ctx.getState();
    ctx.openTeams();
    return { ok: true, note: s.teams ? 'Already joined the demo company.' : 'The demo code is filled in. Press Join.' };
  },

  async worry() {
    const j = ensureJoined();
    if (!j.ok) return j;
    worryArmed = true;
    try { ctx.openPlay('worry'); } finally { worryArmed = false; }
    return { ok: true, note: 'Press Feed it. The first reply can take a few seconds.' };
  },

  async call() {
    if (callOn) return { ok: false, note: 'A simulated call is already running.' };
    const j = ensureJoined();
    if (!j.ok) return j;
    callOn = true;
    ctx.Calls.setOverride(() => callOn);
    await ctx.checkCall();
    setTimeout(async () => {
      callOn = false;
      await ctx.checkCall();
      ctx.Calls.setOverride(null);
    }, CALL_MS).unref();
    return { ok: true, note: 'Mochi goes quiet now. The call ends by itself in about 40 seconds.' };
  },

  async break() {
    if (callOn) return { ok: false, note: 'Wait for the simulated call to end first.' };
    const j = ensureJoined();
    if (!j.ok) return j;
    ctx.Idle.setOverride(() => 60);
    setTimeout(() => ctx.Idle.setOverride(null), BREAK_WINDOW_MS).unref();
    ctx.send('action', 'demo-nudge-water');
    return { ok: true, note: 'Click Done on the reminder. Then open Mochi for Teams: the real breaks count goes up.' };
  },

  async bigcall() {
    if (callOn) return { ok: false, note: 'Wait for the simulated call to end first.' };
    const j = ensureJoined();
    if (!j.ok) return j;
    ctx.send('action', 'big-call');
    return { ok: true, note: 'Choose how you feel about the call.' };
  },

  async shared() {
    const j = ensureJoined();
    if (!j.ok) return j;
    const s = ctx.getState();
    if (!s.teams.team) s.teams.team = s.teams.teams[0];
    if (!s.teams.insights) s.teams.insightsSince = ctx.Insights.weekKey();
    s.teams.insights = true;
    s.teams.asked = true; // the demo skips the one-time consent screen here
    const wk = ctx.Insights.weekKey();
    if (s.demoSeeded !== wk) {
      s.insights = s.insights || {};
      seedWeek(s.insights, ctx.Insights, new Date(), s.schedule === 'night' ? null : s.bedtime);
      s.demoSeeded = wk;
    }
    ctx.teamsChanged();
    ctx.openTeams();
    return { ok: true, note: 'Open "What would be shared" in the window. This is a sample week.' };
  },

  async pulse() {
    if (pulseWin && !pulseWin.isDestroyed()) { pulseWin.show(); pulseWin.focus(); return { ok: true, note: 'Mochi Pulse is open.' }; }
    const { BrowserWindow, shell } = require('electron');
    pulseWin = new BrowserWindow({
      width: 1320,
      height: 900,
      minWidth: 420,
      minHeight: 500,
      title: 'Mochi Pulse (sample data)',
      backgroundColor: '#f3f6fb',
      autoHideMenuBar: true,
      icon: path.join(__dirname, '..', 'icon.png'),
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    pulseWin.setMenu(null);
    // Nothing inside navigates away or opens windows; links go to the browser.
    pulseWin.webContents.on('will-navigate', (e) => e.preventDefault());
    pulseWin.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https:\/\//.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    pulseWin.loadFile(path.join(__dirname, '..', '..', 'pulse', 'index.html'), { query: { sample: '1' } });
    pulseWin.on('closed', () => { pulseWin = null; });
    return { ok: true, note: 'Mochi Pulse opened with the sample company.' };
  },
};

function openTour() {
  if (tourWin && !tourWin.isDestroyed()) { tourWin.show(); tourWin.focus(); return; }
  const { BrowserWindow } = require('electron');
  const wa = ctx.screen.getPrimaryDisplay().workArea;
  tourWin = new BrowserWindow({
    width: 380,
    height: 340,
    x: wa.x + 24,
    y: wa.y + 24,
    title: 'Mochi Demo tour',
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    backgroundColor: '#17171f',
    icon: path.join(__dirname, '..', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'tour-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  tourWin.setMenu(null);
  tourWin.setAlwaysOnTop(true, 'floating');
  tourWin.loadFile(path.join(__dirname, 'tour.html'));
  tourWin.on('closed', () => { tourWin = null; });
}

function restartTour() {
  openTour();
  if (tourWin && !tourWin.isDestroyed()) tourWin.webContents.send('demo-restart');
}

// Back to a first run: forget the demo user and relaunch.
function reset() {
  const { dialog } = require('electron');
  const choice = dialog.showMessageBoxSync({
    type: 'question',
    message: 'Reset the demo?',
    detail: 'This clears the demo company, the sample week and Mochi’s settings in this demo app, then restarts it. Your normal Mochi is not touched.',
    buttons: ['Reset', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
  });
  if (choice !== 0) return;
  try { fs.unlinkSync(ctx.statePath()); } catch { /* nothing saved yet */ }
  ctx.app.relaunch();
  ctx.app.exit(0);
}

function menuItems() {
  return [
    { type: 'separator' },
    { label: 'Demo tour', click: openTour },
    { label: 'Restart tour', click: restartTour },
    { label: 'Reset demo…', click: () => { if (ctx) reset(); } },
    { type: 'separator' },
  ];
}

function init(context) {
  ctx = context;
  callOn = false;
  worryArmed = false;
  tourWin = null;
  pulseWin = null;
  ctx.ipcMain.handle('demo-steps', () => STEPS.map(({ id, title, text, button }) => ({ id, title, text, button })));
  ctx.ipcMain.handle('demo-run', async (_e, id) => {
    const run = STEPS.some((s) => s.id === id) && steps[id];
    if (!run) return { ok: false, note: 'Unknown step.' };
    try { return await run(); } catch (e) { return { ok: false, note: 'That did not work: ' + String(e.message || e).slice(0, 80) }; }
  });
  // Get the on-device model loaded as soon as the demo company is joined, so
  // the first worry reply is quick.
  setInterval(() => { if (ctx.teamsOn()) ctx.warmAi(); }, 10_000).unref();
  setTimeout(openTour, 2500).unref();
}

module.exports = { init, menuItems, worryText, handlerIds: () => Object.keys(steps) };
