// Run on the Windows PC once the pack is in place:
//   node tools/voice-smoke.js <packDir> [recording.wav]
// Prints, for each of the six voices, how long the first sentence takes and the
// real-time factor (under 1.0 is fine), and transcribes a 16 kHz mono 16-bit WAV if given.
const fs = require('fs');
const { createEngine } = require('../src/voice/engine');
const Voices = require('../src/voice/voices');
const { MAX_RTF, MAX_FIRST_MS } = require('../src/voice/host');

function readWav(file) {
  const b = fs.readFileSync(file);
  const at = b.indexOf('data') + 8;
  const n = (b.length - at) >> 1;
  return Float32Array.from({ length: n }, (_, i) => b.readInt16LE(at + i * 2) / 32768);
}

(async () => {
  const [packDir, wav] = process.argv.slice(2);
  if (!packDir) { console.error('usage: node tools/voice-smoke.js <packDir> [recording.wav]'); process.exit(1); }
  const eng = await createEngine(packDir);
  await eng.tts('Hi.', Voices.VOICES[0].kokoro, 1); // load models, not timed
  for (const v of Voices.VOICES) {
    const t0 = Date.now();
    const r = await eng.tts('Hello, I am here with you.', v.kokoro, Voices.speedFor(v.id, 'default'));
    const ms = Date.now() - t0, rtf = ms / ((r.pcm.length / r.rate) * 1000);
    console.log(v.id.padEnd(8), v.kokoro.padEnd(10), 'first', String(ms).padStart(5), 'ms', 'rtf', rtf.toFixed(2),
      rtf < MAX_RTF && ms < MAX_FIRST_MS ? 'OK' : 'TOO SLOW');
  }
  if (wav) console.log('transcript:', JSON.stringify(await eng.stt(readWav(wav))));
})().catch((e) => { console.error(e); process.exit(1); });
