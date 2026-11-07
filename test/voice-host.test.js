// node test/voice-host.test.js
const assert = require('assert');
const { createHost, MAX_RTF, MAX_FIRST_MS } = require('../src/voice/host');

// A fake worker channel. `ms` = how long each tts takes on the fake clock.
function fake({ ms = 100, sec = 2 } = {}) {
  const ch = { sent: [], killed: false, clock: 0, handlers: {} };
  ch.postMessage = (m) => {
    ch.sent.push(m);
    if (m.type === 'tts') { ch.clock += ms; setImmediate(() => ch.handlers.message({ id: m.id, type: 'audio', pcm: new Float32Array(24000 * sec), rate: 24000 })); }
    if (m.type === 'stt') setImmediate(() => ch.handlers.message({ id: m.id, type: m.samples.length ? 'text' : 'error', text: 'hello', message: 'empty' }));
  };
  ch.on = (evt, fn) => { ch.handlers[evt] = fn; };
  ch.kill = () => { ch.killed = true; ch.handlers.exit && ch.handlers.exit(); };
  return ch;
}
const timers = () => { const t = { fn: null }; t.set = (fn) => { t.fn = fn; return 1; }; t.clear = () => { t.fn = null; }; return t; };

(async () => {
  // chunks: index 0..n-1, last only on the final one
  { const ch = fake(); const h = createHost({ spawn: () => ch });
    const got = [];
    await h.speak({ sentences: ['One.', 'Two.', 'Three.'], voice: 'af_heart', speed: 0.9, onAudio: (c) => got.push(c) });
    assert.deepStrictEqual(got.map((c) => [c.index, c.last]), [[0, false], [1, false], [2, true]]);
    assert.strictEqual(ch.sent[0].voice, 'af_heart'); assert.strictEqual(ch.sent[0].speed, 0.9);
    assert.strictEqual(h.isLoaded(), true); h.shutdown(); }

  // pauses: the gap after each sentence is passed along with its audio
  { const ch = fake(); const h = createHost({ spawn: () => ch });
    const got = [];
    await h.speak({ sentences: ['One.', 'Two.', 'Three.'], pauses: [350, 700], voice: 'v', speed: 1, onAudio: (c) => got.push(c) });
    assert.deepStrictEqual(got.map((c) => c.pause), [350, 700, 0]);
    h.shutdown(); }

  // stop() cancels: no more chunks, a cancel message goes out
  { const ch = fake(); const h = createHost({ spawn: () => ch }); const got = [];
    const p = h.speak({ sentences: ['One.', 'Two.', 'Three.'], voice: 'v', speed: 1, onAudio: (c) => { got.push(c); h.stop(); } });
    await p;
    assert.strictEqual(got.length, 1);
    assert(ch.sent.some((m) => m.type === 'cancel'));
    h.shutdown(); }

  // worker error -> plain rejection
  { const ch = fake(); const h = createHost({ spawn: () => ch });
    await assert.rejects(h.transcribe(new Float32Array(0)), /empty/);
    assert.strictEqual(await h.transcribe(new Float32Array(10)), 'hello'); h.shutdown(); }

  // idle unload then respawn
  { let spawned = 0; const t = timers();
    const h = createHost({ spawn: () => { spawned++; return fake(); }, idleMs: 600000, setTimer: t.set, clearTimer: t.clear });
    await h.speak({ sentences: ['A.'], voice: 'v', speed: 1, onAudio() {} });
    assert.strictEqual(h.isLoaded(), true); assert(t.fn);
    t.fn(); assert.strictEqual(h.isLoaded(), false);
    await h.speak({ sentences: ['B.'], voice: 'v', speed: 1, onAudio() {} });
    assert.strictEqual(spawned, 2); h.shutdown(); }

  // speed test: fast ok, slow not ok
  { const mkClock = (ch) => () => ch.clock;
    const fast = fake({ ms: 300, sec: 2 }); const hf = createHost({ spawn: () => fast, now: mkClock(fast) });
    const rf = await hf.speedTest('v', 1); assert.strictEqual(rf.ok, true); assert(rf.rtf < MAX_RTF); assert(rf.firstMs < MAX_FIRST_MS);
    const slow = fake({ ms: 3000, sec: 2 }); const hs = createHost({ spawn: () => slow, now: mkClock(slow) });
    const rs = await hs.speedTest('v', 1); assert.strictEqual(rs.ok, false);
    const lag = fake({ ms: 2500, sec: 6 }); const hl = createHost({ spawn: () => lag, now: mkClock(lag) });
    const rl = await hl.speedTest('v', 1); assert.strictEqual(rl.ok, false, 'real-time but first sentence too slow');
    hf.shutdown(); hs.shutdown(); hl.shutdown(); }

  // shutdown kills and rejects pending
  { const ch = fake(); ch.postMessage = () => {}; const h = createHost({ spawn: () => ch });
    const p = h.transcribe(new Float32Array(5)); h.shutdown();
    await assert.rejects(p, /stopped/); assert.strictEqual(ch.killed, true); }

  console.log('voice-host ok');
})().catch((e) => { console.error(e); process.exit(1); });
