const test = require('node:test');
const assert = require('node:assert/strict');
const Away = require('../src/away');

const run = (key, idle, ms = 60) => new Promise((resolve) => {
  const calls = [];
  const stop = Away.watch(key, { idle, pollMs: 5, windowMs: 40, onAway: () => calls.push('away'), onNoBreak: () => calls.push('nobreak') });
  setTimeout(() => resolve({ calls, stop }), ms);
});

test('needs 20, 45 and 60 quiet seconds for eyes, water and stretch', () => {
  assert.deepEqual(Away.AWAY_SEC, { eyes: 20, water: 45, stretch: 60 });
});

test('going quiet long enough calls onAway once and never onNoBreak', async () => {
  const { calls } = await run('stretch', () => 60);
  assert.deepEqual(calls, ['away']);
});

test('one second short of the need is not a break; the window ends with onNoBreak once', async () => {
  const { calls } = await run('stretch', () => 59);
  assert.deepEqual(calls, ['nobreak']);
});

test('staying busy through the window calls onNoBreak once', async () => {
  const { calls } = await run('water', () => 10);
  assert.deepEqual(calls, ['nobreak']);
});

test('the stop function prevents both callbacks', async () => {
  const calls = [];
  const stop = Away.watch('eyes', { idle: () => 0, pollMs: 5, windowMs: 40, onAway: () => calls.push('away'), onNoBreak: () => calls.push('nobreak') });
  stop();
  await new Promise((r) => setTimeout(r, 70));
  assert.deepEqual(calls, []);
});

test('an unknown key fires nothing and returns a stop function', async () => {
  const { calls, stop } = await run('bogus', () => 999);
  assert.deepEqual(calls, []);
  assert.equal(typeof stop, 'function');
});
