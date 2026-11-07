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
    if (m.type === 'tts') setImmediate(() => ch.handlers.message({ id: m.id, type: 'audio', pcm: new Float32Array(2400), rate: 24000 }));
  };
  ch.on = (e, f) => { ch.handlers[e] = f; };
  ch.kill = () => {};
  return ch;
}
const mk = (voice, extra = {}) => {
  const sent = [], log = [];
  const state = { petGender: 'female', voice: { on: false, voice: null, pace: 'default', ...voice } };
  const v = createVoice({ getState: () => state, packDir: '/x', spawn: () => fakeChannel(log), sendToPlay: (c, p) => sent.push([c, p]), ...extra });
  return { v, sent, log, state };
};

(async () => {
  // off: nothing happens, host never loaded
  { const { v, log } = mk({ on: false });
    await v.speak(['Hi.']);
    assert.strictEqual(log.length, 0); assert(!loaded('host.js'), 'host not loaded while off'); v.shutdown(); }

  // on: respelled, kokoro id and speed passed, chunks forwarded
  { const { v, sent, log } = mk({ on: true });
    await v.speak(['Mochi says hi. Two sentences.']);
    assert(loaded('host.js')); assert(!loaded('engine.js'), 'engine never in the main process');
    const tts = log.filter((m) => m.type === 'tts');
    assert.deepStrictEqual(tts.map((m) => m.text), ['Mo-chee says hi.', 'Two sentences.']);
    assert.strictEqual(tts[0].voice, 'af_heart'); assert.strictEqual(tts[0].speed, 0.9);
    assert.strictEqual(sent.filter(([c]) => c === 'voice-audio').length, 2);
    // a short breath after each sentence, a longer one between lines, none at the very end
  { const { v, sent } = mk({ on: true });
    await v.speak(['One. Two.', 'Three.']);
    assert.deepStrictEqual(sent.filter(([c]) => c === 'voice-audio').map(([, p]) => p.pause), [350, 700, 0]); v.shutdown(); }
  // chosen voice + slower pace
    v.shutdown(); }
  { const { v, log } = mk({ on: true, voice: 'bella', pace: 'slower' });
    await v.speak(['Hello there.']);
    assert.strictEqual(log.find((m) => m.type === 'tts').voice, 'af_bella');
    assert.strictEqual(log.find((m) => m.type === 'tts').speed, 0.86); v.shutdown(); }

  // stop() tells the player
  { const { v, sent } = mk({ on: true });
    await v.speak(['One.']); sent.length = 0; v.stop();
    assert(sent.some(([c]) => c === 'voice-stopped')); v.shutdown(); }

  // a new speak stops the old one first
  { const { v, sent } = mk({ on: true });
    const p1 = v.speak(['One. Two. Three.']); const p2 = v.speak(['Fresh.']);
    await Promise.all([p1, p2]);
    const firstStop = sent.findIndex(([c]) => c === 'voice-stopped');
    assert(firstStop >= 0); v.shutdown(); }

  // empty lines: nothing to say
  { const { v, log } = mk({ on: true }); await v.speak([]); assert.strictEqual(log.length, 0); v.shutdown(); }

  // worker failure is reported, not thrown
  { const sent = []; const state = { petGender: 'male', voice: { on: true, voice: null, pace: 'default' } };
    const bad = { handlers: {}, postMessage(m) { setImmediate(() => bad.handlers.message({ id: m.id, type: 'error', message: 'boom' })); }, on(e, f) { bad.handlers[e] = f; }, kill() {} };
    const v = createVoice({ getState: () => state, packDir: '/x', spawn: () => bad, sendToPlay: (c, p) => sent.push([c, p]) });
    await v.speak(['Hi.']);
    assert(sent.some(([c, p]) => c === 'voice-error' && p === 'failed')); v.shutdown(); }

  // gender not chosen yet: the neutral first voice (Fable) is used
  { const { v, log } = mk({ on: true }, { }); v.shutdown();
    const sent = [], l2 = []; const state = { petGender: null, voice: { on: true, voice: null, pace: 'default' } };
    const v2 = createVoice({ getState: () => state, packDir: '/x', spawn: () => fakeChannel(l2), sendToPlay: (c, p) => sent.push([c, p]) });
    await v2.speak(['Hi.']); assert.strictEqual(l2.find((m) => m.type === 'tts').voice, 'bm_fable'); v2.shutdown(); }

  // a saved voice from another gender is not used (gender changed after choosing)
  { const l3 = []; const state = { petGender: 'male', voice: { on: true, voice: 'bella', pace: 'default' } };
    const v3 = createVoice({ getState: () => state, packDir: '/x', spawn: () => fakeChannel(l3), sendToPlay() {} });
    await v3.speak(['Hi.']); assert.strictEqual(l3.find((m) => m.type === 'tts').voice, 'am_puck'); v3.shutdown(); }

  console.log('voice-index ok');
})().catch((e) => { console.error(e); process.exit(1); });
