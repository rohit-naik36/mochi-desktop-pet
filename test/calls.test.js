// node test/calls.test.js
const assert = require('assert');
const Calls = require('../src/calls');

const K = 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone';
const block = (key, inUse) => `${K}\\${key}\r\n    Value    REG_SZ    Allow\r\n    LastUsedTimeStart    REG_QWORD    0x${inUse ? '1dc3a1b2c3d4e5f' : '1dc3a1b2c3d4e5f'}\r\n    LastUsedTimeStop    REG_QWORD    0x${inUse ? '0' : '1dc3a1b2c3d9999'}\r\n`;
const STORE_KEY = 'LittleSmokeStudio.Mochi-DeskBuddy_abc123xyz';
const EXE_KEY = 'NonPackaged\\C:#Program Files#Mochi#Mochi.exe';
const TEAMS_KEY = 'NonPackaged\\C:#Users#me#AppData#Local#Teams#ms-teams.exe';
const join = (...b) => `\r\n${K}\r\n    Value    REG_SZ    Allow\r\n\r\n` + b.join('\r\n');

// Existing behaviour unchanged
assert.strictEqual(Calls.deviceInUse(join(block(TEAMS_KEY, true))), true);
assert.strictEqual(Calls.deviceInUse(join(block(TEAMS_KEY, false))), false);
assert.strictEqual(Calls.deviceInUse(''), false);

// Mochi alone (Store and unpackaged forms)
const ownStore = ['littlesmokestudio.mochi-deskbuddy_'];
const ownExe = ['c:#program files#mochi#mochi.exe'];
assert.strictEqual(Calls.deviceInUse(join(block(STORE_KEY, true)), { own: ownStore }), false);
assert.strictEqual(Calls.deviceInUse(join(block(EXE_KEY, true)), { own: ownExe }), false);
assert.strictEqual(Calls.deviceInUse(join(block(EXE_KEY, true).toUpperCase()), { own: ownExe }), false, 'case-insensitive');
// Without the exclusion, Mochi's own use would count
assert.strictEqual(Calls.deviceInUse(join(block(STORE_KEY, true))), true);
// Mochi and another app: still a call
assert.strictEqual(Calls.deviceInUse(join(block(STORE_KEY, true), block(TEAMS_KEY, true)), { own: ownStore }), true);

// ownTokens covers both forms
const t = Calls.ownTokens();
assert(t.includes('littlesmokestudio.mochi-deskbuddy_'));
assert(t.includes(process.execPath.toLowerCase().replace(/\\/g, '#')));

// Paused during a hold
(async () => {
  Calls.setOverride(() => true);
  assert.strictEqual(await Calls.onCall(), true);
  Calls.setPaused(true);
  assert.strictEqual(await Calls.onCall(), false);
  Calls.setPaused(false);
  assert.strictEqual(await Calls.onCall(), true);
  Calls.setOverride(null);
  console.log('calls ok');
})().catch((e) => { console.error(e); process.exit(1); });
