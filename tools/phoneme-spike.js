// Run on the Windows PC. Compares Mochi's own phonemizer (no GPL code) with the
// eSpeak NG one that kokoro-js ships with, so you can LISTEN to the difference.
//
//   npm i --no-save cmu-pronouncing-dictionary
//   node tools/phoneme-spike.js <packDir> <outDir> [--voice af_heart] [--file my-sentences.txt]
//
// Writes <outDir>/NN-a-espeak.wav and NN-b-new.wav for every sentence, prints both
// phoneme strings, any word the dictionary did not know, and any symbol Kokoro would
// silently drop. The eSpeak path is used here for comparison only and is never shipped.
const fs = require('fs');
const path = require('path');
const { createPhonemizer } = require('../src/voice/phonemes');
const { respell } = require('../src/voice/text');
const Voices = require('../src/voice/voices');
const { KOKORO_ID } = require('../src/voice/engine');

const SENTENCES = [
  'Hello, I am here with you.',
  "That sounds really heavy, and it makes sense that you're tired.",
  'Take one slow breath in, and let it out gently.',
  'Mochi is right here, and you are not alone.',
  "You don't have to fix everything tonight.",
  'You could call a helpline: iCall, 9152987821.',
  'In India you can also call Tele-MANAS on 14416 or 1800 891 4416.',
  'In the US you can call or text 988 at any time.',
  "What's one small thing that would feel kinder right now?",
  'Whatever happened at work today, your worth is not measured by a deadline.',
  'Sometimes anxiety whispers that everything will go wrong, but it is only a feeling.',
  'Would you like to tell me more, or shall we just sit quietly for a minute?',
];

function arg(name, dflt) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : dflt; }

function wav(file, pcm, rate) {
  const b = Buffer.alloc(44 + pcm.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36);
  b.writeUInt32LE(pcm.length * 2, 40);
  for (let i = 0; i < pcm.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
}

(async () => {
  const [packDir, outDir] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--'));
  if (!packDir || !outDir) {
    console.error('usage: node tools/phoneme-spike.js <packDir> <outDir> [--voice af_heart] [--file sentences.txt]');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const voice = arg('voice', 'af_heart');
  const sentences = arg('file') ? fs.readFileSync(arg('file'), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : SENTENCES;

  let dictionary;
  try {
    const mod = await import('cmu-pronouncing-dictionary');
    dictionary = mod.dictionary || mod.default;
    const meta = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'cmu-pronouncing-dictionary', 'package.json'), 'utf8'));
    console.log(`dictionary: ${meta.name}@${meta.version}, licence field: ${meta.license}, ${Object.keys(dictionary).length} entries`);
  } catch (e) {
    console.error('Missing dictionary. Run:  npm i --no-save cmu-pronouncing-dictionary\n', e.message);
    process.exit(1);
  }
  const mine = createPhonemizer(dictionary);

  const { env } = await import('@huggingface/transformers');
  env.allowRemoteModels = false; env.allowLocalModels = true;
  env.localModelPath = path.join(packDir, 'models');
  const { KokoroTTS } = await import('kokoro-js');
  const { phonemize: espeak } = await import('phonemizer'); // comparison only
  const tts = await KokoroTTS.from_pretrained(KOKORO_ID, { dtype: 'fp32', device: 'cpu' });
  const vocab = new Set(Object.keys(JSON.parse(fs.readFileSync(
    path.join(packDir, 'models', KOKORO_ID, 'tokenizer.json'), 'utf8')).model.vocab));
  const pace = Voices.speedFor((Voices.VOICES.find((v) => v.kokoro === voice) || { id: 'heart' }).id, 'default');

  const allOov = new Map(), dropped = new Set();
  await tts.generate('Hi.', { voice, speed: pace }); // warm up, not timed
  for (let i = 0; i < sentences.length; i++) {
    const text = respell(sentences[i]);
    const n = String(i + 1).padStart(2, '0');
    const [theirs] = await espeak(text, 'en-us');
    const { ps, oov } = mine.phonemize(text);
    for (const w of oov) allOov.set(w, (allOov.get(w) || 0) + 1);
    for (const ch of ps) if (!vocab.has(ch)) dropped.add(ch);

    const a = await tts.generate(text, { voice, speed: pace });
    wav(path.join(outDir, `${n}-a-espeak.wav`), a.audio, a.sampling_rate);
    const t0 = Date.now();
    const { input_ids } = tts.tokenizer(ps, { truncation: true });
    const b = await tts.generate_from_ids(input_ids, { voice, speed: pace });
    wav(path.join(outDir, `${n}-b-new.wav`), b.audio, b.sampling_rate);

    console.log(`\n${n}  ${text}\n  espeak: ${theirs}\n  new:    ${ps}${oov.length ? '\n  unknown words: ' + oov.join(', ') : ''}` +
      `\n  new path took ${Date.now() - t0} ms for ${(b.audio.length / b.sampling_rate).toFixed(1)} s of audio`);
  }
  console.log('\n--- summary ---');
  console.log('words not in the dictionary:', allOov.size ? [...allOov].map(([w, c]) => `${w}(${c})`).join(', ') : 'none');
  console.log('symbols Kokoro would drop:', dropped.size ? [...dropped].map((c) => JSON.stringify(c)).join(' ') : 'none');
  console.log(`WAVs in ${path.resolve(outDir)}: listen to each NN-a (current) then NN-b (new).`);
})().catch((e) => { console.error(e); process.exit(1); });
