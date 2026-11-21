// Mac auto-updater (ADR 0001). Direct-download signed Mac build only.
// electron-updater is required lazily, inside start(), so no other build
// ever loads it or has a code path that makes the request.
const Rules = require('./updater-rules');

const TICK_MS = 60 * 60 * 1000; // look at the clock hourly; the 24h rule decides

let started = false;
let timer = null;
let wired = false;

// ctx: { app, getState, saveState, showNotice, platform, mas, demo }
//   showNotice(done): shows the first-run notice, calls done(turnOff:boolean)
function available(ctx) {
  return Rules.canAutoUpdate({ platform: ctx.platform, mas: ctx.mas, packaged: ctx.app.isPackaged, demo: ctx.demo });
}

function settings(ctx) {
  const st = ctx.getState();
  st.autoUpdate = Rules.normalize(st.autoUpdate);
  return st.autoUpdate;
}

function start(ctx) {
  if (started || !available(ctx)) return false;
  started = true;
  const au = settings(ctx);
  const tick = () => { if (Rules.shouldCheck(settings(ctx), Date.now())) check(ctx); };
  if (au.noticeShown) tick();
  else {
    // No check until the notice has been shown.
    au.noticeShown = true;
    ctx.saveState();
    ctx.showNotice((turnOff) => {
      if (turnOff) { au.enabled = false; ctx.saveState(); }
      tick();
    });
  }
  timer = setInterval(tick, TICK_MS);
  if (timer.unref) timer.unref();
  return true;
}

function check(ctx) {
  // Record the attempt first so a failure never causes a retry loop.
  const au = settings(ctx);
  au.lastCheck = Date.now();
  ctx.saveState();
  try {
    const { autoUpdater } = require('electron-updater');
    Object.assign(autoUpdater, Rules.updaterOptions(ctx.app.getVersion()));
    autoUpdater.logger = null; // silent: no dialogs, no badges, no notifications
    if (!wired) { wired = true; autoUpdater.on('error', (e) => console.error('[updater]', e && e.message)); }
    autoUpdater.checkForUpdates().catch((e) => console.error('[updater]', e && e.message));
  } catch (e) {
    console.error('[updater]', e && e.message);
  }
}

module.exports = { start, available };
