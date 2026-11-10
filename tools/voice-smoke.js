// Run on the Windows PC once the speech pack is in place:
//   node tools/voice-smoke.js <packDir> <recording.wav>
// Transcribes a 16 kHz mono 16-bit WAV with the real listening model and prints
// the text plus how long it took (the first run also loads the model).
const fs = require('fs');
const { createEngine } = require('../src/voice/engine');

function readWav(file) {
  const b = fs.readFileSync(file);
  const at = b.indexOf('data') + 8;
  const n = (b.length - at) >> 1;
  return Float32Array.from({ length: n }, (_, i) => b.readInt16LE(at + i * 2) / 32768);
}

(async () => {
  const [packDir, wav] = process.argv.slice(2);
  if (!packDir || !wav) { console.error('usage: node tools/voice-smoke.js <packDir> <recording.wav>'); process.exit(1); }
  const samples = readWav(wav);
  const secs = samples.length / 16000;
  const eng = await createEngine(packDir);
  for (const label of ['first run (loads the model)', 'second run']) {
    const t0 = Date.now();
    const text = await eng.stt(samples);
    const ms = Date.now() - t0;
    console.log(`${label}: ${ms} ms for ${secs.toFixed(1)} s of audio (x${(ms / 1000 / secs).toFixed(2)})`);
    console.log('  transcript:', JSON.stringify(text));
  }
})().catch((e) => { console.error(e); process.exit(1); });
