// node test/voice-host.test.js
const assert = require('assert');
const { createHost } = require('../src/voice/host');

// A fake worker channel that answers speech-to-text requests.
function fake() {
  const ch = { sent: [], killed: false, handlers: {} };
  ch.postMessage = (m) => {
    ch.sent.push(m);
    if (m.type === 'stt') setImmediate(() => ch.handlers.message({ id: m.id, type: m.samples.length ? 'text' : 'error', text: 'hello', message: 'empty' }));
  };
  ch.on = (evt, fn) => { ch.handlers[evt] = fn; };
  ch.kill = () => { ch.killed = true; ch.handlers.exit && ch.handlers.exit(); };
  return ch;
}
const timers = () => { const t = { fn: null }; t.set = (fn) => { t.fn = fn; return 1; }; t.clear = () => { t.fn = null; }; return t; };

(async () => {
  // worker error -> plain rejection
  { const ch = fake(); const h = createHost({ spawn: () => ch });
    await assert.rejects(h.transcribe(new Float32Array(0)), /empty/);
    assert.strictEqual(await h.transcribe(new Float32Array(10)), 'hello'); h.shutdown(); }

  // idle unload then respawn
  { let spawned = 0; const t = timers();
    const h = createHost({ spawn: () => { spawned++; return fake(); }, idleMs: 600000, setTimer: t.set, clearTimer: t.clear });
    await h.transcribe(new Float32Array(3));
    assert.strictEqual(h.isLoaded(), true); assert(t.fn);
    t.fn(); assert.strictEqual(h.isLoaded(), false);
    await h.transcribe(new Float32Array(3));
    assert.strictEqual(spawned, 2); h.shutdown(); }

  // shutdown kills and rejects pending
  { const ch = fake(); ch.postMessage = () => {}; const h = createHost({ spawn: () => ch });
    const p = h.transcribe(new Float32Array(5)); h.shutdown();
    await assert.rejects(p, /stopped/); assert.strictEqual(ch.killed, true); }

  console.log('voice-host ok');
})().catch((e) => { console.error(e); process.exit(1); });
