const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const { isDemo } = require('../src/demo-flag');
const Calls = require('../src/calls');
const Idle = require('../src/idle');
const Insights = require('../src/insights');
const Company = require('../src/company');
const { seedWeek } = require('../src/demo/seed');
const { STEPS, SAMPLE_WORRY } = require('../src/demo/steps');
const Demo = require('../src/demo');
const pkg = JSON.parse(read('package.json'));

test('demo mode comes only from the build, or a dev run from the repo', () => {
  assert.strictEqual(isDemo({}, true, {}), false);
  assert.strictEqual(isDemo({ mochiDemo: true }, true, {}), true);
  assert.strictEqual(isDemo({}, false, { MOCHI_DEMO: '1' }), true, 'dev run');
  assert.strictEqual(isDemo({}, true, { MOCHI_DEMO: '1' }), false, 'a packaged app ignores the environment');
  assert.strictEqual(isDemo({ mochiDemo: 'yes' }, true, {}), false, 'only a real true counts');
  assert.strictEqual(isDemo(null, true, undefined), false);
});

test('normal builds do not carry the demo or set the flag', () => {
  assert.notStrictEqual(pkg.mochiDemo, true);
  assert.ok(pkg.build.files.includes('!src/demo/**'), 'src/demo is left out of normal builds');
});

test('the demo build config sets the flag, its own identity and no server', () => {
  const y = read('demo/electron-builder.yml');
  assert.match(y, /appId: com\.mochi\.demo/);
  assert.match(y, /productName: Mochi Demo/);
  assert.match(y, /mochiDemo: true/);
  assert.match(y, /src\/demo\/\*\*|src\/\*\*\/\*/);
  assert.match(y, /pulse\/\*\*\/\*/);
  assert.ok(!/MOCHI_SERVER/.test(y), 'no server address in the demo build');
  const wf = read('.github/workflows/build-demo.yml');
  assert.ok(!/MOCHI_SERVER/.test(wf), 'no server address in the demo workflow');
  assert.ok(!/action-gh-release|softprops/.test(wf), 'the demo is never published as a release');
});

test('the demo company works offline and never has a server', () => {
  assert.strictEqual(Company.hasServer(), false);
  const c = Company.lookup(Company.DEMO_CODE);
  assert.strictEqual(c.demo, true);
  assert.ok(c.support.length >= 1 && c.teams.length >= 8);
});

test('a simulated call replaces the real check, and goes away again', async () => {
  let on = true;
  Calls.setOverride(() => on);
  assert.strictEqual(await Calls.onCall(), true);
  on = false;
  assert.strictEqual(await Calls.onCall(), false);
  Calls.setOverride(null);
});

test('simulated quiet time replaces the idle check, and goes away again', () => {
  Idle.setOverride(() => 60);
  assert.strictEqual(Idle.get(), 60);
  Idle.setOverride('not a function'); // anything but a function clears it
  Idle.setOverride(() => 0);
  assert.strictEqual(Idle.get(), 0);
  Idle.setOverride(null);
});

test('the sample week has counts for HR, never words, and shows a real-break gap', () => {
  const store = {};
  seedWeek(store, Insights, new Date(2026, 9, 30, 12, 0), 23); // a Friday
  const p = Insights.packet(store, { id: 'acme-demo', team: 'Engineering' }, '2026-10-26');
  assert.strictEqual(p.activeDays, 5);
  assert.ok(p.lateNights >= 1);
  assert.ok(Object.values(p.moodCheckIns).reduce((a, b) => a + b, 0) >= 5);
  assert.ok(p.supportShown >= 1);
  assert.ok(p.reminders.done > p.reminders.away, 'some Done clicks were not real breaks');
  assert.ok(p.reminders.away > 0);
  assert.strictEqual(p.calls.count, 5);
  assert.ok(Object.keys(p.worryThemes).every((k) => Insights.THEMES.includes(k)));
  assert.ok(!JSON.stringify(p).includes(SAMPLE_WORRY), 'no worry text is ever stored');
});

test('on a Wednesday the sample week covers Monday to Wednesday', () => {
  const store = {};
  seedWeek(store, Insights, new Date(2026, 9, 28, 12, 0), 23);
  assert.strictEqual(Insights.packet(store, null, '2026-10-26').activeDays, 3);
});

test('the tour has eight steps, each with a handler and a button', () => {
  assert.strictEqual(STEPS.length, 8);
  assert.strictEqual(new Set(STEPS.map((s) => s.id)).size, 8);
  for (const s of STEPS) assert.ok(s.title && s.text && s.button, s.id);
  assert.deepStrictEqual(Demo.handlerIds().sort(), STEPS.map((s) => s.id).sort());
});

test('the sample worry is mild and short enough for the box', () => {
  assert.ok(SAMPLE_WORRY.length <= 280);
  assert.ok(!/suicid|kill|die|hurt/i.test(SAMPLE_WORRY));
});

test('the sample worry is only offered while the tour arms it', () => {
  assert.strictEqual(Demo.worryText(), '');
});

// ---- the tour driven against a stand-in for the app ----

function standIn() {
  const handlers = {};
  const log = [];
  const state = { teams: null, insights: {}, schedule: 'day', bedtime: 23, ai: { on: true } };
  const win = () => ({ setMenu() {}, setAlwaysOnTop() {}, loadFile(f, o) { log.push(['loadFile', path.basename(f), o && o.query]); }, on() {}, isDestroyed: () => false, show() {}, focus() {}, webContents: { on() {}, setWindowOpenHandler() {}, send() {} } });
  const fakeElectron = { BrowserWindow: function () { return win(); }, dialog: { showMessageBoxSync: () => 1 }, shell: { openExternal() {} } };
  const ctx = {
    app: { relaunch() { log.push(['relaunch']); }, exit() { log.push(['exit']); } },
    screen: { getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1040 } }) },
    ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
    Company, Insights, Calls, Idle,
    getState: () => state,
    statePath: () => path.join(require('os').tmpdir(), 'mochi-demo-test-nonexistent.json'),
    send: (ch, a) => log.push(['send', ch, a]),
    saveState() {}, refreshTrayMenu() {}, teamsChanged: () => log.push(['teamsChanged']),
    openTeams: () => log.push(['openTeams']),
    openPlay: (g) => log.push(['openPlay', g, Demo.worryText()]),
    joinCompany: (c) => { state.teams = { ...c, team: null, insights: false, asked: false }; log.push(['join', c.code]); },
    checkCall: async () => { log.push(['checkCall', await Calls.onCall()]); },
    teamsOn: () => !!state.teams,
    warmAi: () => log.push(['warmAi']),
  };
  return { handlers, log, state, ctx, fakeElectron };
}

test('every tour step drives the real hooks', async () => {
  const Module = require('module');
  const { handlers, log, state, ctx, fakeElectron } = standIn();
  const load = Module._load;
  Module._load = function (request, ...rest) { return request === 'electron' ? fakeElectron : load.call(this, request, ...rest); };
  try {
    Demo.init(ctx);
    const run = (id) => handlers['demo-run']({}, id);
    const steps = await handlers['demo-steps']();
    assert.strictEqual(steps.length, 8);

    assert.strictEqual((await run('nope')).ok, false);

    assert.strictEqual((await run('meet')).ok, true);
    assert.ok(log.some((e) => e[0] === 'send' && e[1] === 'action' && e[2] === 'pet'));

    // Not joined yet: the Teams window opens with the join form (nothing joined silently).
    assert.strictEqual((await run('join')).ok, true);
    assert.strictEqual(state.teams, null);
    assert.ok(log.some((e) => e[0] === 'openTeams'));

    // The sample worry is offered once, to the window the step opens.
    assert.strictEqual((await run('worry')).ok, true);
    assert.deepStrictEqual(log.find((e) => e[0] === 'openPlay'), ['openPlay', 'worry', SAMPLE_WORRY]);
    assert.strictEqual(Demo.worryText(), '', 'disarmed straight after');
    assert.strictEqual(state.teams.demo, true, 'joined the demo company');

    // A simulated call: quiet starts, a second press is refused, break/pep talk wait for it.
    assert.strictEqual((await run('call')).ok, true);
    assert.deepStrictEqual(log.filter((e) => e[0] === 'checkCall').pop(), ['checkCall', true]);
    assert.strictEqual((await run('call')).ok, false);
    assert.strictEqual((await run('break')).ok, false);
    assert.strictEqual((await run('bigcall')).ok, false);
    Calls.setOverride(null);
  } finally {
    Module._load = load;
    Calls.setOverride(null);
    Idle.setOverride(null);
  }
});

test('the break, pep talk, shared-data and Pulse steps', async () => {
  const Module = require('module');
  const { handlers, log, state, ctx, fakeElectron } = standIn();
  const load = Module._load;
  Module._load = function (request, ...rest) { return request === 'electron' ? fakeElectron : load.call(this, request, ...rest); };
  try {
    Demo.init(ctx);
    const run = (id) => handlers['demo-run']({}, id);

    assert.strictEqual((await run('break')).ok, true);
    assert.strictEqual(Idle.get(), 60, 'the keyboard counts as quiet for the next few minutes');
    assert.ok(log.some((e) => e[0] === 'send' && e[2] === 'demo-nudge-water'));

    assert.strictEqual((await run('bigcall')).ok, true);
    assert.ok(log.some((e) => e[0] === 'send' && e[2] === 'big-call'));

    assert.strictEqual((await run('shared')).ok, true);
    assert.strictEqual(state.teams.insights, true);
    assert.strictEqual(state.teams.asked, true);
    assert.strictEqual(state.teams.team, 'Engineering');
    const before = JSON.stringify(state.insights);
    assert.ok(Insights.packet(state.insights, state.teams).activeDays >= 1);
    await run('shared'); // pressing it twice must not double the sample week
    assert.strictEqual(JSON.stringify(state.insights), before);

    assert.strictEqual((await run('pulse')).ok, true);
    const pulse = log.find((e) => e[0] === 'loadFile' && e[1] === 'index.html');
    assert.deepStrictEqual(pulse[2], { sample: '1' });
    assert.ok(fs.existsSync(path.join(root, 'pulse', 'index.html')), 'the page the step opens exists');
  } finally {
    Module._load = load;
    Idle.setOverride(null);
  }
});

test('another company on this laptop is never overwritten by the tour', async () => {
  const Module = require('module');
  const { handlers, state, ctx, fakeElectron } = standIn();
  state.teams = { id: 'real-co', demo: false, support: [], teams: ['A'] };
  const load = Module._load;
  Module._load = function (request, ...rest) { return request === 'electron' ? fakeElectron : load.call(this, request, ...rest); };
  try {
    Demo.init(ctx);
    for (const id of ['worry', 'call', 'break', 'bigcall', 'shared']) {
      const r = await handlers['demo-run']({}, id);
      assert.strictEqual(r.ok, false, id);
    }
    assert.strictEqual(state.teams.id, 'real-co');
  } finally { Module._load = load; }
});
