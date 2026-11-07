// Run on the Windows PC. Lets you HEAR each character's voice: every character says its own
// welcome line in a blend of two Kokoro voices, so you can judge "does this voice fit this
// character?" and change the mix by editing tools/voice-lab-recipes.json.
//
//   npm i --no-save cmu-pronouncing-dictionary      (once, same as the phoneme spike)
//   node tools/voice-lab.js <packDir> <outDir> [--gender female|male|nonbinary] [--name Rohit] [--line 0]
//
// Writes <outDir>/<gender>-<character>.wav and prints the recipe and the words spoken.
// Before anything else it checks that speaking through our own blended style gives the same
// audio as kokoro-js's own call for a plain voice. If that check fails, nothing is written.
const fs = require('fs');
const path = require('path');
const { createPhonemizer } = require('../src/voice/phonemes');
const { blend, styleRow, readVoice, STYLE_DIM } = require('../src/voice/blend');
const { speakable } = require('../src/voice/text');
const { CHARACTERS } = require('../src/voice/characters');
const { KOKORO_ID } = require('../src/voice/engine');
const { writeWav } = require('./wav');
const recipes = require('./voice-lab-recipes.json');

function arg(name, dflt) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : dflt; }
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

(async () => {
  const [packDir, outDir] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--'));
  if (!packDir || !outDir) {
    console.error('usage: node tools/voice-lab.js <packDir> <outDir> [--gender female|male|nonbinary] [--name Rohit] [--line 0]');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const genders = arg('gender') ? [arg('gender')] : ['female', 'male', 'nonbinary'];
  for (const g of genders) if (!recipes[g]) { console.error('unknown gender', g); process.exit(1); }
  const name = arg('name', ''), lineNo = Number(arg('line', 0));

  let dictionary;
  try { const m = await import('cmu-pronouncing-dictionary'); dictionary = m.dictionary || m.default; }
  catch (e) { console.error('Missing dictionary. Run:  npm i --no-save cmu-pronouncing-dictionary'); process.exit(1); }
  const phon = createPhonemizer(dictionary);

  globalThis.I18N = {}; require('../src/persona'); // fills globalThis.I18N.persona
  const persona = globalThis.I18N.persona.en;

  const { env, Tensor } = await import('@huggingface/transformers');
  env.allowRemoteModels = false; env.allowLocalModels = true;
  env.localModelPath = path.join(packDir, 'models');
  const { KokoroTTS } = await import('kokoro-js');
  const tts = await KokoroTTS.from_pretrained(KOKORO_ID, { dtype: 'fp32', device: 'cpu' });

  const voiceDir = path.join(packDir, 'models', KOKORO_ID, 'voices');
  const cache = {};
  const voice = (id) => cache[id] || (cache[id] = readVoice(fs.readFileSync(path.join(voiceDir, id + '.bin'))));

  async function say(ps, style, speed) {
    const { input_ids } = tts.tokenizer(ps, { truncation: true });
    const row = styleRow(style, input_ids.dims.at(-1));
    const out = await tts.model({
      input_ids,
      style: new Tensor('float32', row, [1, STYLE_DIM]),
      speed: new Tensor('float32', [speed], [1]),
    });
    return out.waveform.data;
  }

  // Sanity check: our path with a plain voice must equal kokoro-js's own path.
  {
    const { ps } = phon.phonemize('Hello, I am here with you.');
    const { input_ids } = tts.tokenizer(ps, { truncation: true });
    const theirs = (await tts.generate_from_ids(input_ids, { voice: 'af_heart', speed: 0.9 })).audio;
    const ours = await say(ps, voice('af_heart'), 0.9);
    let diff = 0;
    for (let i = 0; i < Math.min(theirs.length, ours.length); i++) diff = Math.max(diff, Math.abs(theirs[i] - ours[i]));
    const ok = theirs.length === ours.length && diff < 1e-3;
    console.log(`self-check (plain af_heart, our path vs kokoro-js): ${ok ? 'PASS' : 'FAIL'} (length ${ours.length}/${theirs.length}, max difference ${diff.toExponential(2)})`);
    if (!ok) { console.error('Stopping: our blended path does not match kokoro-js. Paste this output to Claude.'); process.exit(2); }
  }

  for (const gender of genders) {
    console.log(`\n=== ${gender} ===`);
    for (const c of CHARACTERS) {
      const r = recipes[gender][c.id];
      const lines = persona[c.id].greet;
      const text = speakable(lines[lineNo % lines.length], { greet: greeting(), name, pet: c.name });
      const { ps, oov } = phon.phonemize(text);
      const style = blend(r.mix.map(([id, weight]) => ({ data: voice(id), weight })));
      const pcm = await say(ps, style, r.pace);
      const file = path.join(outDir, `${gender}-${c.name.toLowerCase()}.wav`);
      writeWav(file, pcm, 24000);
      console.log(`${c.name.padEnd(7)} ${r.mix.map(([v, w]) => v + ' x' + w).join(' + ')} at ${r.pace}\n        "${text}"${oov.length ? '\n        unknown words: ' + oov.join(', ') : ''}`);
    }
  }
  console.log(`\nWAVs in ${path.resolve(outDir)}. Listen to each, then tell Claude per character: fits / too X / try more of Y.`);
})().catch((e) => { console.error(e); process.exit(1); });
