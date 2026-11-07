// node test/voice-hold.test.js
const assert = require('assert');
const { createHold } = require('../src/voice/hold');

function mk(maxMs) {
  const calls = [], timers = [];
  const h = createHold({
    onStart: () => calls.push('start'), onStop: () => calls.push('stop'), maxMs,
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimer: () => {},
  });
  return { h, calls, timers };
}

{ const { h, calls } = mk();
  assert.strictEqual(h.active(), false);
  assert.strictEqual(h.start(), true); assert.strictEqual(h.active(), true);
  assert.deepStrictEqual(calls, ['start']);
  assert.strictEqual(h.start(), false, 'second start ignored'); assert.deepStrictEqual(calls, ['start']);
  h.stop(); h.stop();
  assert.deepStrictEqual(calls, ['start', 'stop'], 'stop is idempotent'); assert.strictEqual(h.active(), false); }

{ const { h, calls, timers } = mk();
  h.start(); assert.strictEqual(timers[0].ms, 30000, 'max hold 30 s');
  timers[0].fn(); // timer fires
  h.stop();       // then the user releases
  assert.deepStrictEqual(calls, ['start', 'stop'], 'onStop exactly once'); }

{ const { h, calls } = mk(); h.stop(); assert.deepStrictEqual(calls, [], 'stop without start does nothing');
  h.start(); h.stop(); assert.strictEqual(h.start(), true, 'can hold again'); }
console.log('voice-hold ok');
