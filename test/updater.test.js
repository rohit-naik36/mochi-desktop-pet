const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = require('../src/updater-rules');
const Updater = require('../src/updater');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const NOW = Date.UTC(2026, 11, 1, 12);
const on = { enabled: true, noticeShown: true, lastCheck: 0 };

test('canAutoUpdate: only a packaged, non-MAS, non-demo Mac build', () => {
  assert.strictEqual(R.canAutoUpdate({ platform: 'darwin', mas: false, packaged: true }), true);
  assert.strictEqual(R.canAutoUpdate({ platform: 'darwin', mas: true, packaged: true }), false);
  assert.strictEqual(R.canAutoUpdate({ platform: 'darwin', mas: false, packaged: false }), false);
  assert.strictEqual(R.canAutoUpdate({ platform: 'darwin', mas: false, packaged: true, demo: true }), false);
  for (const platform of ['win32', 'linux']) {
    assert.strictEqual(R.canAutoUpdate({ platform, mas: false, packaged: true }), false);
  }
  assert.strictEqual(R.canAutoUpdate(), false);
});

test('at most one check per 24 hours', () => {
  assert.strictEqual(R.shouldCheck({ ...on, lastCheck: NOW - 23 * 3600e3 }, NOW), false);
  assert.strictEqual(R.shouldCheck({ ...on, lastCheck: NOW - R.DAY_MS + 1 }, NOW), false);
  assert.strictEqual(R.shouldCheck({ ...on, lastCheck: NOW - R.DAY_MS }, NOW), true);
  assert.strictEqual(R.shouldCheck({ ...on, lastCheck: 0 }, NOW), true);
  // clock moved back a little: still counts as just checked
  assert.strictEqual(R.shouldCheck({ ...on, lastCheck: NOW + 3600e3 }, NOW), false);
  // absurd future time must not block checks forever
  assert.strictEqual(R.shouldCheck({ ...on, lastCheck: NOW + 10 * R.DAY_MS }, NOW), true);
});

test('off switch and missing first-run notice stop every check', () => {
  assert.strictEqual(R.shouldCheck({ ...on, enabled: false }, NOW), false);
  assert.strictEqual(R.shouldCheck({ ...on, noticeShown: false }, NOW), false);
  assert.strictEqual(R.shouldCheck(undefined, NOW), false); // default: notice not shown yet
});

test('defaults: on, notice not shown, never checked; bad data is repaired', () => {
  assert.deepStrictEqual(R.defaultSettings(), { enabled: true, noticeShown: false, lastCheck: 0 });
  assert.deepStrictEqual(R.normalize(null), R.defaultSettings());
  assert.deepStrictEqual(R.normalize({ enabled: 'yes', noticeShown: 1, lastCheck: 'x' }), R.defaultSettings());
  assert.deepStrictEqual(R.normalize({ enabled: false, noticeShown: true, lastCheck: 5 }), { enabled: false, noticeShown: true, lastCheck: 5 });
});

test('user-agent is only Mochi/<version>', () => {
  assert.strictEqual(R.userAgent('1.2.3'), 'Mochi/1.2.3');
  const o = R.updaterOptions('1.2.3');
  assert.deepStrictEqual(o.requestHeaders, { 'User-Agent': 'Mochi/1.2.3' });
  assert.doesNotMatch(o.requestHeaders['User-Agent'], /Electron|Chrome|Mac|Windows/);
});

test('updater options: install on quit, no pre-releases, no downgrades', () => {
  const o = R.updaterOptions('1.0.0');
  assert.strictEqual(o.autoInstallOnAppQuit, true);
  assert.strictEqual(o.allowPrerelease, false);
  assert.strictEqual(o.allowDowngrade, false);
});

test('Updater.start does nothing outside the direct-download Mac build', () => {
  for (const c of [
    { platform: 'win32', mas: false, packaged: true },
    { platform: 'linux', mas: false, packaged: true },
    { platform: 'darwin', mas: true, packaged: true },
    { platform: 'darwin', mas: false, packaged: false },
  ]) {
    let touched = false;
    const state = {};
    const ctx = {
      app: { isPackaged: c.packaged, getVersion: () => '1.0.0' },
      platform: c.platform, mas: c.mas,
      getState: () => { touched = true; return state; },
      saveState: () => { touched = true; },
      showNotice: () => { touched = true; },
    };
    assert.strictEqual(Updater.available(ctx), false);
    assert.strictEqual(Updater.start(ctx), false);
    assert.strictEqual(touched, false);
  }
});

test('package.json: electron-updater is a dependency and publish targets GitHub Releases', () => {
  assert.ok(pkg.dependencies['electron-updater']);
  assert.strictEqual(pkg.build.publish.provider, 'github');
  assert.ok(pkg.build.publish.owner && pkg.build.publish.repo);
  assert.ok((pkg.build.mac.target || []).some((t) => (t.target || t) === 'zip'), 'mac zip target is needed for updates');
});

test('electron-updater is only required inside src/updater.js start path', () => {
  const src = path.join(root, 'src');
  for (const f of fs.readdirSync(src).filter((n) => n.endsWith('.js'))) {
    const text = fs.readFileSync(path.join(src, f), 'utf8');
    if (f === 'updater.js') {
      assert.doesNotMatch(text.split('\n').filter((l) => !/^\s/.test(l)).join('\n'), /require\('electron-updater'\)/, 'must be lazy');
    } else {
      assert.doesNotMatch(text, /electron-updater/, f);
    }
  }
});

test('first run on the Mac build: notice first, no check until it is shown, once only', () => {
  const state = {};
  let saves = 0;
  let finish;
  const ctx = {
    app: { isPackaged: true, getVersion: () => '1.0.0' },
    platform: 'darwin', mas: false,
    getState: () => state, saveState: () => { saves++; },
    showNotice: (done) => { finish = done; },
  };
  assert.strictEqual(Updater.start(ctx), true);
  assert.ok(finish, 'notice was shown');
  assert.strictEqual(state.autoUpdate.noticeShown, true, 'flag persisted when shown');
  assert.strictEqual(state.autoUpdate.lastCheck, 0, 'no check before the notice is dismissed');
  assert.strictEqual(Updater.start(ctx), false, 'second start does nothing');
  finish(true); // user chose "Turn off"
  assert.strictEqual(state.autoUpdate.enabled, false);
  assert.strictEqual(state.autoUpdate.lastCheck, 0, 'off means no check');
});
