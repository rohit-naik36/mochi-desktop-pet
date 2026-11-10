// node test/voice-index.test.js
const assert = require('assert');
const path = require('path');
const loaded = (name) => Object.keys(require.cache).some((k) => k.endsWith(path.join('voice', name)));

// Load test: requiring the facade pulls in no host, worker or engine.
const { createVoice } = require('../src/voice');
assert(!loaded('host.js') && !loaded('worker.js') && !loaded('engine.js'), 'nothing heavy on require');

function fakeChannel(log) {
  const ch = { handlers: {} };
  ch.postMessage = (m) => {
    log.push(m);
    if (m.type === 'stt') setImmediate(() => ch.handlers.message({ id: m.id, type: 'text', text: ' hello there ' }));
  };
  ch.on = (e, f) => { ch.handlers[e] = f; };
  ch.kill = () => { ch.killed = true; };
  return ch;
}

(async () => {
  const log = [];
  let spawnedWith = null, ch = null;
  const v = createVoice({ packDir: '/x', spawn: (dir) => { spawnedWith = dir; ch = fakeChannel(log); return ch; } });
  assert(!loaded('host.js'), 'host not loaded until first use');

  // Listening works through the host; the engine never loads in the main process.
  const text = await v.getHost().transcribe(new Float32Array(16000));
  assert.strictEqual(text, ' hello there ');
  assert(loaded('host.js')); assert(!loaded('engine.js'), 'engine never in the main process');
  assert.strictEqual(spawnedWith, '/x');
  assert.deepStrictEqual(log.map((m) => m.type), ['stt']);

  // Mochi does not speak any more: no speaking API, no audio messages.
  assert.strictEqual(typeof v.speak, 'undefined');
  assert.strictEqual(typeof v.getHost().speak, 'undefined');
  assert.strictEqual(typeof v.getHost().speedTest, 'undefined');

  // Shutdown stops the process, and a later call starts a new one.
  v.shutdown(); assert.strictEqual(ch.killed, true);
  const before = log.length;
  await v.getHost().transcribe(new Float32Array(16000));
  assert.strictEqual(log.length, before + 1);
  v.shutdown();
  console.log('voice-index ok');
})().catch((e) => { console.error(e); process.exit(1); });
