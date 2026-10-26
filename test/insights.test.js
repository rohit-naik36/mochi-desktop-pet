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
assert.deepStrictEqual(p.reminders, { shown: 1, done: 1, snoozed: 0 });

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
