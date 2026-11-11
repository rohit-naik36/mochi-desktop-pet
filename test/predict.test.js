const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/predict');

const at = (day, h, m = 0) => new Date(2026, 10, 9 + day, h, m); // day 0 = Monday 9 Nov 2026
const many = (r, nudge, outcome, d, n) => { for (let i = 0; i < n; i++) P.record(r, nudge, outcome, d); };

test('slotOf runs Monday 00:00 = 0 to Sunday 23:00 = 167, and stays in range across a DST week', () => {
  assert.equal(P.slotOf(at(0, 0, 30)), 0);
  assert.equal(P.slotOf(at(6, 23, 59)), 167);
  for (let i = 0; i < 24 * 8; i++) {
    const s = P.slotOf(new Date(Date.UTC(2026, 2, 5) + i * 3600_000)); // around the March clock changes
    assert.ok(Number.isInteger(s) && s >= 0 && s <= 167, 'slot ' + s);
  }
});

test('an empty rhythm is not ready, has a wide range, and keeps the fixed timer', () => {
  const r = P.fresh(), x = P.predict(r, 'water', at(0, 11));
  assert.equal(x.ready, false);
  assert.equal(x.n, 0);
  assert.ok(x.lo < 0.2 && x.hi > 0.8);
  assert.equal(P.should(r, 'water', at(0, 11)), true);
});

test('20 acted outcomes in a slot make it ready, high and narrower', () => {
  const r = P.fresh();
  many(r, 'stretch', 'acted', at(0, 11), 20);
  const x = P.predict(r, 'stretch', at(0, 11)), e = P.predict(P.fresh(), 'stretch', at(0, 11));
  assert.equal(x.ready, true);
  assert.ok(x.p > 0.9);
  assert.ok(x.hi - x.lo < e.hi - e.lo);
  assert.ok(x.lo <= x.p && x.p <= x.hi);
  assert.equal(P.should(r, 'stretch', at(0, 11)), true);
});

test('20 ignored outcomes make a slot ready and unlikely, so should is false', () => {
  const r = P.fresh();
  many(r, 'eyes', 'ignored', at(2, 16), 20);
  const x = P.predict(r, 'eyes', at(2, 16));
  assert.equal(x.ready, true);
  assert.ok(x.p < 0.2);
  assert.equal(P.should(r, 'eyes', at(2, 16)), false);
});

test('the neighbouring hour shares counts; a far hour does not', () => {
  const r = P.fresh();
  many(r, 'water', 'acted', at(0, 11), 20);
  const near = P.predict(r, 'water', at(0, 12)), far = P.predict(r, 'water', at(0, 16));
  assert.ok(near.n > 0 && near.p > 0.5);
  assert.equal(far.n, 0);
});

test('neighbour sharing wraps around the week', () => {
  const r = P.fresh();
  many(r, 'water', 'acted', at(0, 0), 20); // Monday 00:00 is slot 0
  assert.ok(P.predict(r, 'water', at(6, 23)).n > 0); // Sunday 23:00 is slot 167
});

test('old counts decay: a changed routine is learned', () => {
  const r = P.fresh();
  many(r, 'water', 'acted', at(0, 9), 20);
  many(r, 'water', 'ignored', at(0, 9), 60);
  assert.ok(P.predict(r, 'water', at(0, 9)).p < 0.3);
});

test('wait: not ready fires now; a good hour ahead is waited for; nothing good or out of time fires now', () => {
  const r = P.fresh();
  assert.equal(P.wait(r, 'water', at(0, 10, 15), at(0, 10, 15), 60), 0);
  many(r, 'water', 'ignored', at(0, 9), 20);
  many(r, 'water', 'ignored', at(0, 10), 20);
  many(r, 'water', 'acted', at(0, 11), 20);
  many(r, 'water', 'acted', at(0, 12), 20);
  const now = at(0, 10, 15);
  assert.equal(P.wait(r, 'water', now, now, 120), 45);
  assert.equal(P.wait(r, 'water', now, new Date(now - 120 * 60_000), 120), 0, 'already waited the whole cap');
  const bad = P.fresh();
  for (const h of [10, 11, 12, 13]) many(bad, 'water', 'ignored', at(0, h), 20);
  assert.equal(P.wait(bad, 'water', at(0, 10), at(0, 10), 60), 0, 'no better slot inside the window');
});

test('sanitize turns anything invalid into an empty rhythm and keeps the on flag', () => {
  for (const bad of [null, undefined, 'x', 5, {}, { v: 1, w: { water: { a: [1], b: [1] } } }]) {
    assert.deepEqual(P.sanitize(bad), P.fresh());
  }
  assert.equal(P.sanitize({ ...P.fresh(), on: false }).on, false);
  const r = P.fresh(); P.record(r, 'water', 'acted', at(0, 9));
  assert.deepEqual(P.sanitize(JSON.parse(JSON.stringify(r))), r);
});

test('record ignores an unknown nudge or outcome', () => {
  const r = P.fresh(), before = JSON.stringify(r);
  P.record(r, 'coffee', 'acted', at(0, 9));
  P.record(r, 'water', 'maybe', at(0, 9));
  assert.equal(JSON.stringify(r), before);
});

// ---- mood ----
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// n consecutive days ending the day before `today`, every day given by mood(i), i = 0 oldest
const history = (today, n, mood) => {
  const [y, m, d] = today.split('-').map(Number), out = {};
  for (let i = 0; i < n; i++) out[key(new Date(y, m - 1, d - n + i))] = mood(i);
  return out;
};

test('with no mood history the mood model is not ready and does not change the opener', () => {
  const x = P.lowMoodChance({}, '2026-11-11');
  assert.equal(x.ready, false);
  assert.equal(P.softOpener({}, '2026-11-11'), false);
});

test('after a long run of low days, another low day looks likely and the opener turns soft', () => {
  const moods = history('2026-11-11', 30, (i) => 1 + (i % 2));
  const x = P.lowMoodChance(moods, '2026-11-11');
  assert.equal(x.ready, true);
  assert.ok(x.p > 0.7);
  assert.equal(P.softOpener(moods, '2026-11-11'), true);
});

test('after a run of good days the opener stays normal, even with plenty of history', () => {
  const moods = history('2026-11-11', 30, (i) => 4 + (i % 2));
  const x = P.lowMoodChance(moods, '2026-11-11');
  assert.equal(x.ready, true);
  assert.ok(x.p < 0.2);
  assert.equal(P.softOpener(moods, '2026-11-11'), false);
});

test('days across a year boundary count as consecutive', () => {
  const moods = history('2027-01-01', 30, () => 1);
  assert.equal(P.softOpener(moods, '2027-01-01'), true);
});

test('garbage mood data never throws and never turns the opener soft', () => {
  for (const bad of [null, undefined, 'x', [], { '2026-11-10': 9, '2026-11-09': 'x', '2026-11-08': null }]) {
    assert.equal(P.softOpener(bad, '2026-11-11'), false);
  }
  assert.equal(P.softOpener({}, 'not a date'), false);
});
