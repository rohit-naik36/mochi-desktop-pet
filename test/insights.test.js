// node test/insights.test.js
const assert = require('assert');
const I = require('../src/insights');

const s = {};
const mon = new Date(2026, 9, 26, 10); // Monday 26 Oct 2026, 10 am
I.record(s, 'mood', 2, mon);
I.record(s, 'worry', 'deadline', mon);
I.record(s, 'worry', 'crisis', mon);
I.record(s, 'worry', 'I hate my manager', mon); // free text is ignored
I.record(s, 'shown', 'water', mon);
I.record(s, 'done', 'water', mon);
I.record(s, 'feature', 'breathe', new Date(2026, 9, 27, 23, 30)); // Tuesday, after bedtime
const p = I.packet(s, { id: 'acme', team: 'Sales' }, '2026-10-26');
assert.strictEqual(p.week, '2026-10-26');
assert.strictEqual(p.activeDays, 2);
assert.strictEqual(p.lateNights, 1);
assert.strictEqual(p.moodCheckIns[2], 1);
assert.deepStrictEqual(p.worryThemes, { deadline: 1 });
assert.strictEqual(p.supportShown, 1);
assert.ok(!JSON.stringify(s).includes('manager'), 'no typed words stored');
assert.deepStrictEqual(p.reminders, { shown: 1, done: 1, away: 0, snoozed: 0 });
I.record(s, 'away', 'water', mon);
I.record(s, 'call', 42, mon);
I.record(s, 'call', 'lots', mon); // not a number: ignored
const p2 = I.packet(s, null, '2026-10-26');
assert.strictEqual(p2.reminders.away, 1);
assert.deepStrictEqual(p2.calls, { count: 1, minutes: 42 });
// A week saved by an older version still works.
const old = { weeks: { '2026-10-26': { days: [0], late: [], moods: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, themes: {}, low: 0, support: 0, shown: {}, done: {}, snoozed: {}, features: {} } } };
I.record(old, 'away', 'eyes', mon);
assert.strictEqual(I.packet(old, null, '2026-10-26').reminders.away, 1);

// Night shift: nothing counts as late.
const n = {};
I.record(n, 'feature', 'pet', new Date(2026, 9, 27, 2), null);
assert.strictEqual(I.packet(n, null, '2026-10-26').lateNights, 0);

// Only 8 weeks are kept.
const k = {};
for (let w = 0; w < 12; w++) I.record(k, 'mood', 3, new Date(2026, 6, 6 + w * 7));
assert.strictEqual(Object.keys(k.weeks).length, I.KEEP_WEEKS);

// Teams under 8 people show nothing; totals are rounded to 5.
assert.strictEqual(I.teamTotals(Array(7).fill(p)), null);
const t = I.teamTotals(Array(9).fill(p));
assert.strictEqual(t.people, 10);
assert.strictEqual(t.worryThemes.deadline, 10);
assert.strictEqual(t.lateNightPeople, 10);
console.log('insights: all good');

// Call detection reads only "in use" from the registry.
const { deviceInUse } = require('../src/calls');
const reg = (start, stop) => `HKEY_CURRENT_USER\\x\\microphone\\NonPackaged\\C:#Zoom.exe\r\n    LastUsedTimeStart    REG_QWORD    0x${start}\r\n    LastUsedTimeStop    REG_QWORD    0x${stop}\r\n`;
assert.strictEqual(deviceInUse(reg('1d9a3b', '0')), true);
assert.strictEqual(deviceInUse(reg('1d9a3b', '1d9a3c')), false);
assert.strictEqual(deviceInUse(reg('0', '0')), false);
assert.strictEqual(deviceInUse(reg('1d9a3b', '1d9a3c') + reg('1d9a40', '0')), true);
assert.strictEqual(deviceInUse(''), false);
console.log('calls: all good');
