// Mochi: a tiny desktop pet that keeps you company while you work.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, powerMonitor, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const I18N = require('./i18n');
const Progress = require('./progress');
const Insights = require('./insights');
const Company = require('./company');
const Campaigns = require('./campaigns');
const Calls = require('./calls');
const Ai = require('./ai');
const Apps = require('./apps');
const Device = require('./device');
const Idle = require('./idle');
// The demo app only (see src/demo-flag.js): normal and Store builds leave
// src/demo out of the package and never load it.
const DEMO = require('./demo-flag').isDemo(require('../package.json'), app.isPackaged, process.env);
const Demo = DEMO ? require('./demo') : null;

const MIN_MS = 60_000;
const WIN_W = 220;
const WIN_H = 260; // room above the pet for speech bubbles

let win;
let tray;
let state;
const IS_MAC = process.platform === 'darwin';
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
  chatty: 'normal', // 'quiet' | 'normal' | 'chatty': how often the buddy talks on its own
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
  teams: null, // Mochi for Teams: { id, name, support, posh, teams, team, insights }
  insights: {}, // anonymous weekly counts, kept only while insights are on
  silent: { auto: true, until: 0 }, // quiet on calls; until = manual silent mode end (ms)
  apps: false, // notice which app is in front (name only) for playful lines; off by default
  ai: { on: true }, // Smarter replies: the small model that ships with Mochi
};

function loadState() {
  try {
    state = { ...defaults, ...JSON.parse(fs.readFileSync(statePath(), 'utf8')) };
    state.nudges = { ...defaults.nudges, ...state.nudges };
    state.silent = { ...defaults.silent, ...state.silent };
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
    // macOS swallows the first click on a window of an app that isn't active,
    // so right-click and pats would do nothing. Let that click through.
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
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
const GAMES = ['breathe', 'bubbles', 'chase', 'worry'];
function openPlay(game) {
  if (hidingUntil) return;
  if (!GAMES.includes(game)) game = undefined;
  if (game === 'worry' && aiOn()) Ai.warm(); // ready by the time they've typed
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
  if (Demo && game === 'worry' && Demo.worryText()) query.demoWorry = Demo.worryText();
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

// ---------- offline AI (beta) ----------

// Smarter replies ship only in the company installer and work while the
// company licence is active.
const aiOn = () => state.ai.on && teamsOn();

// The written reply is always ready first; the model may only reword it.
ipcMain.handle('ai-reply', (_e, req = {}) => {
  if (!aiOn() || Ai.status().state !== 'ready' || !Ai.allowed(req.r, req.text)) return null;
  return Ai.reply({ text: req.text, lang: req.lang, name: state.userName, pet: state.name, skin: state.skin });
});

// ---------- notice which app I'm in (opt-in) ----------

// Same kind of app for 90 minutes straight (2.5 hours if Mochi is set to
// quiet) gets one playful line, at most every 45 minutes, never on a call,
// in focus time or while hiding. Only the kind of app is kept, in memory.
const APP_LONG_MIN = { quiet: 150, normal: 90, chatty: 60 };
let appKind = null, appSince = 0, appLastLine = 0;

function onApp(kind) {
  const now = Date.now();
  if (powerMonitor.getSystemIdleTime() >= 5 * 60 || kind !== appKind) { appKind = kind; appSince = now; return; }
  if (!kind) return;
  const need = (APP_LONG_MIN[state.chatty] || 90) * MIN_MS;
  if (now - appSince < need || now - appLastLine < 45 * MIN_MS) return;
  if (quietNow() || hidingUntil || state.focusUntil > now) return;
  appLastLine = now;
  appSince = now; // the next line for the same app waits another full stretch
  send('action', 'app-' + kind);
}

function setApps(on) {
  state.apps = on;
  saveState();
  appKind = null;
  if (on) Apps.start(onApp); else Apps.stop();
}

function appsItem(M) {
  return {
    label: M('noticeApps'),
    toolTip: I18N.t(state.lang, 'tips.noticeApps'),
    type: 'checkbox',
    checked: !!state.apps,
    click: (i) => {
      if (!i.checked) return setApps(false);
      const response = dialog.showMessageBoxSync({
        type: 'question',
        title: 'Mochi',
        message: M('noticeAppsAsk'),
        detail: M('noticeAppsDetail'),
        buttons: [M('noticeAppsYes'), M('noticeAppsNo')],
        defaultId: 0,
        cancelId: 1,
      });
      setApps(response === 0);
      refreshTrayMenu();
    },
  };
}

// One checkbox in Settings, on by default. Hidden in builds without the
// model and outside a company.
function aiItem(M) {
  const s = Ai.status();
  if (s.state === 'missing' || !teamsOn()) return null;
  const note = s.state === 'error' ? M('smarterFailed') : '';
  return {
    label: M('smarter') + (note ? ` (${note})` : ''),
    toolTip: I18N.t(state.lang, 'tips.smarter'),
    type: 'checkbox',
    checked: state.ai.on,
    click: (i) => {
      state.ai.on = i.checked;
      saveState();
      if (i.checked) Ai.turnOn(); else Ai.turnOff();
      refreshTrayMenu();
    },
  };
}

let aiMenuAt = 0;
function aiChanged(s) {
  if (Date.now() - aiMenuAt < 1000) return;
  if (s.state === 'error') console.error('[ai]', s.error);
  aiMenuAt = Date.now();
  if (tray) refreshTrayMenu();
}

// ---------- points and badges ----------

// Any window reports an activity here; new badges are announced by the pet
// (or in the play layer if it's open) and the board refreshes.
ipcMain.on('track', (_e, event, n = 1) => {
  if (typeof event !== 'string') return;
  n = Math.max(1, Math.min(100, Math.round(Number(n)) || 1));
  if (Insights.NUDGES.includes(event)) { noteInsight('done', event); checkAway(event); }
  else noteInsight('feature', event);
  const unlocked = Progress.record(state.stats, event, n);
  saveState();
  for (const id of unlocked) {
    send('achievement', id);
    if (playWin && !playWin.isDestroyed()) playWin.webContents.send('achievement', id);
  }
  if (boardWin && !boardWin.isDestroyed()) boardWin.webContents.send('state', state);
  if (unlocked.length) refreshTrayMenu();
});

// ---------- breaks, calls and silent mode ----------

// "Done" is only a click. After it, see whether the keyboard and mouse really
// go quiet for a moment within a few minutes. Only yes or no is kept.
const AWAY_SEC = { eyes: 20, water: 45, stretch: 60 };
let lastSneaky = 0;
function checkAway(key) {
  const need = AWAY_SEC[key];
  if (!need || !teamsOn()) return;
  const started = Date.now();
  const timer = setInterval(() => {
    const idle = Idle.get();
    if (idle >= need) {
      clearInterval(timer);
      noteInsight('away', key);
      saveState();
    } else if (Date.now() - started > 4 * MIN_MS) {
      clearInterval(timer);
      // A playful nudge, at most once every two hours, never on a call.
      if (!quietNow() && Date.now() - lastSneaky > 120 * MIN_MS) { lastSneaky = Date.now(); send('action', 'sneaky-' + key); }
    }
  }, 2000);
}

// On a call (mic or camera in use), or in manual silent mode, Mochi fades
// and keeps every reminder and line for later.
let onCall = false;
let callStart = 0;
// Silent mode, the break check and big-call pep talks are Mochi for Teams
// features.
const quietNow = () => teamsOn() && (onCall || state.silent.until > Date.now());
function sendQuiet(extra = {}) {
  send('quiet', { call: onCall, until: state.silent.until, ...extra });
}
async function checkCall() {
  const now = teamsOn() && state.silent.auto ? await Calls.onCall() : false;
  if (now === onCall) return;
  onCall = now;
  let endedMin = 0;
  if (now) callStart = Date.now();
  else {
    endedMin = Math.round((Date.now() - callStart) / MIN_MS);
    noteInsight('call', endedMin);
    saveState();
  }
  sendQuiet({ endedMin });
  refreshTrayMenu();
}
function setSilent(min) {
  state.silent.until = min === 0 ? 0 : min < 0 ? Number.MAX_SAFE_INTEGER : Date.now() + min * MIN_MS;
  saveState();
  sendQuiet({ manual: min !== 0 ? 'on' : 'off' });
  refreshTrayMenu();
}

// ---------- Mochi for Teams ----------

// Counts only, kept on this laptop while the person is in a company: they
// show as "your week" in the Teams window. Only when insights are on are
// they added to the team's totals.
function noteInsight(kind, value) {
  if (!state.teams) return;
  Insights.record(state.insights, kind, value, new Date(), state.schedule === 'night' ? null : state.bedtime);
  if (teamsWin && !teamsWin.isDestroyed()) teamsWin.webContents.send('teams', teamsView());
}
ipcMain.on('insight', (_e, kind, value) => {
  if (!['mood', 'worry', 'shown', 'snoozed'].includes(kind)) return;
  noteInsight(kind, typeof value === 'number' ? value : String(value || '').slice(0, 20));
  saveState();
});

function teamsView() {
  const t = state.teams, today = Progress.dayKey();
  const q = t && (t.questions || []).find((x) => x.start <= today && today <= x.end);
  const c = t && Campaigns.active(t.campaigns, today);
  return {
    company: t,
    packet: t ? Insights.packet(state.insights, t) : null,
    question: q ? { ...q, answer: (t.answered || {})[q.id] ?? null } : null,
    campaign: c ? { ...c, name: Campaigns.THEMES[c.theme].name } : null,
    minGroup: Insights.MIN_GROUP,
    roundTo: Insights.ROUND_TO,
    demoCode: DEMO ? Company.DEMO_CODE : null,
  };
}
function teamsChanged() {
  saveState();
  send('state', state);
  refreshTrayMenu();
  if (teamsWin && !teamsWin.isDestroyed()) teamsWin.webContents.send('teams', teamsView());
}
ipcMain.handle('teams-get', () => teamsView());
// Joining: the demo code works offline. Otherwise, with the Teams server set
// up, the code is checked there (and this laptop counts as one seat); without
// it, the code must match the company file IT placed on the laptop.
function joinCompany(c) {
  state.teams = { ...c, team: null, insights: false, asked: false, joinedAt: Progress.dayKey(), checkedAt: Date.now() };
  state.insights = {};
  teamsChanged();
}
ipcMain.handle('teams-join', async (_e, code) => {
  const local = Company.lookup(code, app.getPath('userData'));
  if (local && (local.demo || !Company.hasServer())) { joinCompany(local); return { ok: true }; }
  if (!Company.hasServer()) return { ok: false, reason: 'unknown-code' };
  const res = await serverCheckin(code);
  if (!res.ok) return res;
  joinCompany(res.company);
  state.teams.grace = res.graceDays;
  saveState();
  return { ok: true };
});
ipcMain.on('teams-set', (_e, partial = {}) => {
  if (!state.teams) return;
  if (typeof partial.team === 'string' && state.teams.teams.includes(partial.team)) state.teams.team = partial.team;
  if (typeof partial.insights === 'boolean') {
    // Only weeks from now on are ever added to team totals.
    if (partial.insights && !state.teams.insights) state.teams.insightsSince = Insights.weekKey();
    state.teams.insights = partial.insights;
    state.teams.asked = true; // the one-time consent screen has been answered
  }
  teamsChanged();
});
ipcMain.on('teams-leave', () => {
  state.teams = null;
  state.insights = {};
  teamsChanged();
});

// IT can roll Mochi out with a company file; people join without a code,
// and insights stay off until they choose.
async function autoJoin() {
  if (!state.teams) {
    const c = Company.fromFile(app.getPath('userData'));
    if (c && c.autoJoin) {
      if (!Company.hasServer() || c.demo) joinCompany(c);
      else {
        const res = await serverCheckin(c.code);
        if (res.ok) { joinCompany(res.company); state.teams.grace = res.graceDays; saveState(); }
      }
    }
  }
  // Ask once, on a friendly screen, before anything is added to team totals.
  if (state.teams && state.teams.asked === false) setTimeout(openTeams, 8000);
}

// ---------- Mochi for Teams: licence and weekly totals ----------

const DAY_MS = 24 * 60 * MIN_MS;
const teamsOn = () => !!state.teams && !state.teams.lapsed;

async function serverCheckin(code) {
  let id = await Device.machineId();
  if (!id) id = state.deviceSeed || (state.deviceSeed = require('crypto').randomUUID());
  return Company.checkin(code, Device.installHash(id), await Device.workAccount(), app.getVersion());
}

// About once a day: count this laptop as a seat and pick up the company's
// latest contacts and teams. If the server can't be reached or says no for
// longer than the grace period, company features pause (free Mochi keeps
// working) until a check-in succeeds again.
async function dailyCheckin(force = false) {
  const t = state.teams;
  if (t && t.demo) { // the demo's campaign and question follow the current week
    const d = Company.lookup(Company.DEMO_CODE);
    if ((t.campaigns || [])[0]?.start !== d.campaigns[0].start) { Object.assign(t, { campaigns: d.campaigns, questions: d.questions }); teamsChanged(); }
    return;
  }
  if (!t || !Company.hasServer()) return;
  if (!force && !t.lapsed && Date.now() - (t.checkedAt || 0) < 20 * 60 * MIN_MS) return; // at most once every 20 hours
  const res = await serverCheckin(t.code);
  if (state.teams !== t) return; // left while we were asking
  if (res.ok) {
    const keep = ['team', 'insights', 'insightsSince', 'asked', 'joinedAt', 'sent', 'answered', 'said'];
    state.teams = { ...res.company, ...Object.fromEntries(keep.map((k) => [k, t[k]])), checkedAt: Date.now(), grace: res.graceDays, lapsed: false };
    if (state.teams.team && !state.teams.teams.includes(state.teams.team)) state.teams.team = null;
  } else {
    t.lapsed = Date.now() - (t.checkedAt || 0) > (t.grace || 45) * DAY_MS;
  }
  teamsChanged();
}

// ---------- Mochi for Teams: wellness campaigns and check-in questions ----------

// The company's open check-in question that this person hasn't answered or
// skipped. Only people who add their counts to team totals are asked, since
// the answer travels with those counts.
function openQuestion() {
  const t = state.teams, today = Progress.dayKey();
  if (!teamsOn() || !t.insights) return null;
  return (t.questions || []).find((q) => q.start <= today && today <= q.end && (t.answered || {})[q.id] == null) || null;
}

// Every few minutes during the work day: ask the open question (at most every
// 3 hours until it's answered or skipped), or say one campaign line a day.
// The pet window shows it only when it isn't busy and reports back.
let askedAt = 0;
function companyTick() {
  const t = state.teams;
  if (!teamsOn() || hidingUntil || quietNow()) return;
  const h = new Date().getHours();
  if (state.schedule !== 'night' && (h < 10 || h >= 18)) return;
  const q = openQuestion();
  if (q && Date.now() - askedAt > 3 * 60 * MIN_MS) {
    askedAt = Date.now();
    send('company', { kind: 'question', id: q.id, company: t.name, text: q.text, options: q.options });
    return;
  }
  const today = Progress.dayKey();
  const c = Campaigns.active(t.campaigns, today);
  if (!c || (t.said && t.said.day === today) || Math.random() > 0.3) return; // one line a day, at a random time
  const seen = (t.said && t.said.ids) || [];
  send('company', {
    kind: 'campaign', id: c.id, company: t.name, action: Campaigns.THEMES[c.theme].action,
    text: I18N.fill(state.lang, Campaigns.line(c.theme, state.lang), { name: state.userName, pet: state.name, gender: state.petGender }),
    note: seen.includes(c.id) ? '' : c.note, // the company's own note, on the first day only
  });
}
ipcMain.on('company-shown', (_e, kind, id, shown) => {
  const t = state.teams;
  if (!t) return;
  if (kind === 'question' && !shown) askedAt = 0; // busy: try again at the next tick
  if (kind === 'campaign' && shown) {
    t.said = { day: Progress.dayKey(), ids: [...new Set([...((t.said && t.said.ids) || []), String(id).slice(0, 40)])].slice(-20) };
    saveState();
  }
});
ipcMain.on('open-teams', () => openTeams());
// From the Teams window. a: the option number, or -1 to skip the question.
ipcMain.on('company-answer', (_e, id, a) => {
  const t = state.teams;
  const q = t && (t.questions || []).find((x) => x.id === id);
  if (!q || !t.insights || !Number.isInteger(a) || a < -1 || a >= q.options.length) return;
  t.answered = { ...(t.answered || {}), [q.id]: a };
  if (a >= 0) noteInsight('answer', { q: q.id, a });
  teamsChanged();
});

// Finished weeks go to the team totals one by one, each at a random time in
// the day and a half after the week ends, apart from the daily check-in, and
// with no laptop id, so a week can't be matched to a seat.
let sending = false;
async function sendWeeks() {
  const t = state.teams;
  if (sending || !teamsOn() || !t.insights || t.demo || !Company.hasServer()) return;
  sending = true;
  try {
    t.sent = t.sent || {};
    const now = Date.now();
    const thisWeek = Insights.weekKey();
    for (const wk of Object.keys(state.insights.weeks || {}).sort()) {
      if (wk >= thisWeek || wk < (t.insightsSince || thisWeek) || t.sent[wk] === true) continue;
      if (!t.sent[wk]) { t.sent[wk] = now + Math.random() * 36 * 60 * MIN_MS; saveState(); continue; }
      if (now < t.sent[wk]) continue;
      if (await Company.sendTotals(t.code, t.team, wk, Insights.packet(state.insights, t, wk))) { t.sent[wk] = true; saveState(); }
    }
  } finally { sending = false; }
}

let teamsWin = null;
function openTeams() {
  if (teamsWin && !teamsWin.isDestroyed()) { teamsWin.show(); teamsWin.focus(); return; }
  teamsWin = new BrowserWindow({
    width: 520,
    height: 700,
    minWidth: 420,
    minHeight: 480,
    title: 'Mochi for Teams',
    backgroundColor: '#17171f',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'teams-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  teamsWin.setMenu(null);
  teamsWin.loadFile(path.join(__dirname, 'teams.html'));
  teamsWin.on('closed', () => { teamsWin = null; });
}

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
  if (!num(x, y)) { playWin.close(); return; }
  const wa = playWin._wa;
  placeAt(wa.x + x - PET_CX, wa.y + y - PET_CY);
  state.x = win.getBounds().x; state.y = win.getBounds().y;
  saveState();
  playWin.close();
});
// Games report happiness gains; the desktop pet applies and saves them.
ipcMain.on('play-reward', (_e, delta) => {
  const clean = {};
  for (const k of ['happiness', 'hunger', 'energy']) {
    const v = delta && delta[k];
    if (Number.isFinite(v)) clean[k] = Math.max(-20, Math.min(20, v));
  }
  send('reward', { delta: clean });
});

function trayIcon() {
  // On a Mac, a black-and-white "Template" icon that macOS tints to match a
  // light or dark menu bar (the colour icon is just a pale dot up there).
  if (IS_MAC) {
    const t = nativeImage.createFromPath(path.join(__dirname, 'trayTemplate.png'));
    if (!t.isEmpty()) { t.setTemplateImage(true); return t; }
  }
  const p = path.join(__dirname, 'icon.png');
  const img = nativeImage.createFromPath(p);
  // The macOS menu bar is a little taller than the Windows tray.
  const size = IS_MAC ? 18 : 16;
  return img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: size, height: size });
}

function buildTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip(`${state.name} the desktop pet`);
  refreshTrayMenu();
  tray.on('click', () => send('action', 'pet'));
}

function buildMenu() {
  const M = (key, count) => I18N.t(state.lang, 'menu.' + key, { name: state.userName, pet: state.name, gender: state.petGender, count });
  // Hover text on Mac (Windows tray menus don't show tooltips; the help item covers both).
  const tip = (key) => ({ toolTip: I18N.t(state.lang, 'tips.' + key, { pet: state.name }) });
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
    { label: M('worry'), ...tip('worry'), click: () => openPlay('worry') },
    { label: M('feed'), ...tip('feed'), click: () => send('action', 'feed') },
    { label: M('play'), ...tip('play'), submenu: [
      { label: M('playTime'), click: () => openPlay() },
      { type: 'separator' },
      { label: M('breathe'), click: () => openPlay('breathe') },
      { label: M('bubbles'), click: () => openPlay('bubbles') },
      { label: M('chase'), click: () => openPlay('chase') },
    ] },
    { label: M('nap'), ...tip('nap'), click: () => send('action', 'sleep') },
    { type: 'separator' },
    state.focusUntil > Date.now()
      ? { label: M('focusStop', Math.ceil((state.focusUntil - Date.now()) / MIN_MS)), click: () => send('action', 'focus-stop') }
      : { label: M('focus'), ...tip('focus'), submenu: [25, 50].map((m) => ({ label: M('focusMin', m), click: () => send('action', 'focus-' + m) })) },
    // Silent mode and big-call pep talks come with Mochi for Teams.
    ...(!teamsOn() ? [] : [{ label: M('silent') + (quietNow() ? ' ✓' : ''), ...tip('silent'), submenu: [
      { label: M('silentAuto'), type: 'checkbox', checked: state.silent.auto, click: (item) => { state.silent.auto = item.checked; saveState(); if (!item.checked && onCall) { onCall = false; sendQuiet(); } } },
      { type: 'separator' },
      ...(state.silent.until > Date.now()
        ? [{ label: M('silentOff'), click: () => setSilent(0) }]
        : [{ label: M('silent30'), click: () => setSilent(30) }, { label: M('silent60'), click: () => setSilent(60) }, { label: M('silentOn'), click: () => setSilent(-1) }]),
      { type: 'separator' },
      { label: M('bigCall'), ...tip('bigCall'), click: () => send('action', 'big-call') },
    ] }]),
    { label: M('mood'), ...tip('mood'), click: () => send('action', 'mood') },
    { label: M('gratitude'), ...tip('gratitude'), click: () => send('action', 'gratitude') },
    { label: M('board'), ...tip('board'), click: openBoard },
    { type: 'separator' },
    { label: M('settings'), submenu: [
      ...[aiItem(M)].filter(Boolean),
      ...(Apps.supported() ? [appsItem(M)] : []),
      { label: state.teams ? '🏢 ' + state.teams.name : M('teams'), ...tip('teams'), click: openTeams },
      { type: 'separator' },
      { label: M('schedule'), ...tip('schedule'), submenu: [
        ...[22, 23, 0, 1].map((h) => ({
          label: M('bedAt', I18N.hourLabel(state.lang, h)),
          type: 'radio',
          checked: state.schedule !== 'night' && state.bedtime === h,
          click: () => setSchedule('day', h),
        })),
        { type: 'separator' },
        { label: M('nightShift'), type: 'radio', checked: state.schedule === 'night', click: () => setSchedule('night') },
      ] },
      { label: M('buddy'), ...tip('buddy'), submenu: SKINS.map((sk) => ({
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
      { label: state.userName ? M('changeName') : M('name'), ...tip('name'), click: () => send('action', 'ask-name') },
      { label: M('gender'), ...tip('gender'), submenu: ['male', 'female', 'nonbinary'].map((g) => ({
        label: I18N.t(state.lang, 'gender.' + g),
        type: 'radio',
        checked: state.petGender === g,
        click: () => { state.petGender = g; saveState(); refreshTrayMenu(); send('state', state); send('action', 'gender-changed'); },
      })) },
      { label: M('language'), ...tip('language'), submenu: I18N.LANGS.map((l) => ({
        label: l.label,
        type: 'radio',
        checked: state.lang === l.id,
        click: () => { state.lang = l.id; saveState(); refreshTrayMenu(); send('state', state); send('action', 'switched'); },
      })) },
      { label: M('chatty'), ...tip('chatty'), submenu: ['quiet', 'normal', 'chatty'].map((c) => ({
        label: M('chatty_' + c),
        type: 'radio',
        checked: (state.chatty || 'normal') === c,
        click: () => { state.chatty = c; saveState(); send('state', state); },
      })) },
      { label: M('wander'), ...tip('wander'), type: 'checkbox', checked: state.walking,
        click: (i) => { state.walking = i.checked; saveState(); send('state', state); } },
      { type: 'separator' },
      { label: M('reminders'), ...tip('reminders'), submenu: [
        toggle('water', M('water', state.waterEveryMin)),
        toggle('stretch', M('stretch', state.stretchEveryMin)),
        toggle('eyes', M('eyes', state.eyesEveryMin)),
      ] },
      // Store (MSIX) builds can't register to start with Windows this way.
      // On macOS (including the sandboxed App Store build) the app registers
      // itself as a login item through SMAppService.
      ...(process.windowsStore || DEMO ? [] : [IS_MAC ? { label: M('startupMac'), ...tip('startup'), type: 'checkbox',
        checked: app.getLoginItemSettings({ type: 'mainAppService' }).status === 'enabled',
        click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked, type: 'mainAppService' }) } : { label: M('startup'), ...tip('startup'), type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) }]),
    ] },
    ...(Demo ? Demo.menuItems() : []),
    { label: M('help'), click: showHelp },
    { label: M('bringBack'), click: () => { const wa = workArea(); placeAt(wa.x + wa.width - WIN_W - 40, wa.y + wa.height - WIN_H); } },
    { label: M('quit'), click: () => app.quit() },
  ]);
}

// Plain list of what each menu item does, since Windows menus can't show tooltips.
function showHelp() {
  const M = (key) => I18N.t(state.lang, 'menu.' + key, { name: state.userName, pet: state.name, gender: state.petGender });
  const Tp = (key) => I18N.t(state.lang, 'tips.' + key, { pet: state.name });
  const rows = [['worry'], ['feed'], ['play'], ['nap'], ['focus'], ...(teamsOn() ? [['silent'], ['bigCall']] : []), ['mood'], ['gratitude'], ['board'],
    ['settings', null], ...(Ai.status().state === 'missing' || !teamsOn() ? [] : [['smarter']]), ['noticeApps'], ['teams'], ['schedule'], ['buddy'], ['name'], ['gender'], ['language'], ['chatty'], ['wander'], ['reminders'], ...(process.windowsStore || DEMO ? [] : [[IS_MAC ? 'startupMac' : 'startup', 'startup']])];
  const detail = rows.map(([k, t]) => (t === null ? '\n' + M(k) : `• ${M(k).replace(/\s*\(.*\)$/, '')}: ${Tp(t || k)}`)).join('\n');
  dialog.showMessageBox({ type: 'info', title: 'Mochi', message: M('helpTitle'), detail, buttons: ['OK'] });
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

// The pet window can already be gone when a late message from its page
// arrives (quitting, relaunching, Reset demo). Every handler below checks this.
const gone = () => !win || win.isDestroyed();

function send(ch, payload) {
  if (!gone()) win.webContents.send(ch, payload);
}

// Renderer asks to toggle click-through as the pointer enters or leaves the pet.
ipcMain.on('mouse-over-pet', (_e, over) => {
  if (gone() || process.env.MOCHI_DEBUG) return;
  win.setIgnoreMouseEvents(!over, { forward: true });
});

// All moves go through placeAt so the window keeps its exact size. On Windows
// with display scaling, setPosition alone lets the size creep by a pixel each
// call, which slowly pushed the pet down behind the taskbar.
function placeAt(x, y) {
  if (gone()) return;
  const wa = screen.getDisplayNearestPoint({ x: x + WIN_W / 2, y: y + WIN_H / 2 }).workArea;
  const nx = Math.min(Math.max(Math.round(x), wa.x - 40), wa.x + wa.width - WIN_W + 40);
  const ny = Math.min(Math.max(Math.round(y), wa.y - 40), wa.y + wa.height - WIN_H);
  win.setBounds({ x: nx, y: ny, width: WIN_W, height: WIN_H });
}


// Wandering sends absolute positions so slow sub-pixel drift isn't lost to rounding.
const num = (...v) => v.every(Number.isFinite);
ipcMain.on('move-to', (_e, x, y) => { if (num(x, y)) placeAt(x, y); });

// Smooth glide used when Mochi gets upset and floats to the middle, and back.
let glideTimer = null;
function glide(tx, ty, ms = 1100) {
  clearInterval(glideTimer);
  if (gone()) return;
  const { x: sx, y: sy } = win.getBounds();
  const t0 = Date.now();
  glideTimer = setInterval(() => {
    if (gone()) { clearInterval(glideTimer); return; }
    const t = Math.min(1, (Date.now() - t0) / ms);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    placeAt(sx + (tx - sx) * e, sy + (ty - sy) * e);
    if (t === 1) clearInterval(glideTimer);
  }, 16);
}

let upsetHome = null;
ipcMain.on('glide-center', () => {
  if (playWin || gone()) return;
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
ipcMain.on('focus-pet', () => { if (!gone()) win.focus(); });

ipcMain.on('move-by', (_e, dx, dy) => {
  if (!num(dx, dy) || gone()) return;
  const { x, y } = win.getBounds();
  placeAt(x + dx, y + dy);
});

// Dragging follows the real cursor position, so rounding never adds up.
let dragOffset = null;
ipcMain.on('drag-start', () => {
  if (gone()) return;
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

ipcMain.on('context-menu', () => {
  // Mochi has no Dock icon on Mac, so bring it forward or the menu may not open.
  if (IS_MAC) app.focus({ steal: true });
  buildMenu().popup({ window: win });
});

// Where the mouse pointer is, relative to the pet, so its eyes can follow it.
// Only used for that; never stored or sent anywhere.
ipcMain.handle('get-cursor', () => {
  if (!win || win.isDestroyed() || !win.isVisible()) return null;
  const p = screen.getCursorScreenPoint();
  const b = win.getBounds();
  return { dx: p.x - (b.x + b.width / 2), dy: p.y - (b.y + b.height - 60) };
});

ipcMain.handle('get-bounds', () => {
  if (gone()) return null;
  const bounds = win.getBounds();
  const wa = screen.getDisplayMatching(bounds).workArea;
  return { win: bounds, workArea: wa };
});

// After a drag the pet stays exactly where it was dropped (pulled back on screen if needed).
ipcMain.on('drag-done', () => {
  if (gone()) return;
  const { x, y } = win.getBounds();
  placeAt(x, y);
  if (process.env.MOCHI_DEBUG) console.log('dropped at', JSON.stringify(win.getBounds()));
});

// The pet page may change only its own fields; company, insights and
// settings are owned here.
const PET_KEYS = ['happiness', 'hunger', 'energy', 'focusUntil', 'focusMin', 'moods', 'gratitude',
  'sleepLog', 'askedNight', 'schedule', 'stayUp', 'userName', 'petGender'];
ipcMain.on('save-state', (_e, partial) => {
  if (partial && typeof partial === 'object') {
    for (const k of PET_KEYS) if (k in partial) state[k] = partial[k];
  }
  if (!upsetHome && !gone()) ({ x: state.x, y: state.y } = win.getBounds()); // not the temporary centre spot
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

// Opened straight from the downloaded disk image, Mochi isn't installed and
// is gone after a restart. Offer to put it in Applications, like most Mac apps.
function offerMoveToApplications() {
  if (!IS_MAC || !app.isPackaged || app.isInApplicationsFolder()) return;
  const M = (key) => I18N.t(state.lang, 'menu.' + key, { pet: state.name });
  const choice = dialog.showMessageBoxSync({
    type: 'question',
    message: M('moveToApps'),
    detail: M('moveToAppsDetail'),
    buttons: [M('moveYes'), M('moveNo')],
    defaultId: 0,
    cancelId: 1,
  });
  if (choice !== 0) return;
  try { app.moveToApplicationsFolder(); } catch (e) { console.error('move to Applications failed', e); }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => send('action', 'pet'));
  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId(DEMO ? 'com.mochi.demo' : 'com.mochi.desktoppet');
    // On a Mac the buddy lives in the menu bar, not the Dock (LSUIElement
    // in the bundle does this too; this covers `npm start`).
    if (IS_MAC) app.dock?.hide();
    loadState();
    state.ai = { ...defaults.ai, ...state.ai };
    Ai.init(state.ai, aiChanged);
    if (state.apps && Apps.supported()) Apps.start(onApp);
    autoJoin();
    offerMoveToApplications();
    createWindow();
    buildTray();
    if (Demo) Demo.init({
      app, BrowserWindow, screen, ipcMain, Company, Insights, Calls, Idle,
      getState: () => state, statePath, send, saveState, refreshTrayMenu, teamsChanged,
      openTeams, openPlay, joinCompany, checkCall, teamsOn, warmAi: () => { if (aiOn()) Ai.warm(); },
    });
    const keepOnScreen = () => { const { x, y } = win.getBounds(); placeAt(x, y); };
    screen.on('display-metrics-changed', keepOnScreen);
    screen.on('display-removed', keepOnScreen);
    keepOnScreen(); // also rescues a pet saved somewhere off screen
    if (process.env.MOCHI_DEBUG) setTimeout(() => openPlay(process.env.MOCHI_DEBUG_GAME || 'bubbles'), 3000);
    if (process.env.MOCHI_DEBUG_BOARD) setTimeout(openBoard, 2000);
    // Tray label shows live stats, so refresh it now and then.
    setInterval(refreshTrayMenu, 60_000);
    setInterval(reportActivity, 15_000);
    setInterval(checkCall, 15_000);
    setTimeout(dailyCheckin, 20_000);
    setInterval(dailyCheckin, 60 * MIN_MS);
    setInterval(sendWeeks, 60 * MIN_MS);
    setInterval(companyTick, 10 * MIN_MS);
    setTimeout(sendWeeks, 2 * MIN_MS);
    // Manual silent mode ends on its own; tell the pet when it does.
    setInterval(() => { if (state.silent.until && state.silent.until <= Date.now()) setSilent(0); }, 30_000);
    powerMonitor.on('resume', reportActivity);
    powerMonitor.on('unlock-screen', reportActivity);
  });
  app.on('before-quit', () => { Apps.stop(); saveState(); });
  app.on('window-all-closed', () => app.quit());
}
