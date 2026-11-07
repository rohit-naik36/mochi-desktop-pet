// node test/voice-resample.test.js
const assert = require('assert');
const { resampleTo16kMono } = require('../src/recorder-worklet');

const tone = (rate, hz, secs) => Float32Array.from({ length: rate * secs }, (_, i) => Math.sin(2 * Math.PI * hz * i / rate));
const crossings = (a) => { let n = 0; for (let i = 1; i < a.length; i++) if (a[i - 1] < 0 && a[i] >= 0) n++; return n; };

const L = tone(48000, 440, 1), R = tone(48000, 440, 1);
const out = resampleTo16kMono([L, R], 48000);
assert(out instanceof Float32Array);
assert.strictEqual(out.length, 16000);
assert(Math.abs(crossings(out) - 440) <= 2, 'same pitch: ' + crossings(out));
assert.strictEqual(resampleTo16kMono([], 48000).length, 0);
assert.strictEqual(resampleTo16kMono([new Float32Array(0)], 44100).length, 0);
assert.strictEqual(resampleTo16kMono([tone(16000, 200, 1)], 16000).length, 16000, 'already 16 kHz');
// stereo with opposite signs mixes to silence
const inv = L.map((v) => -v);
assert(resampleTo16kMono([L, inv], 48000).every((v) => Math.abs(v) < 1e-6));
console.log('voice-resample ok');
