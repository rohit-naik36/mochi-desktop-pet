// Run on the Windows PC. Speaks a REAL worry reply (the one from your screenshot, plus a
// generated one) several ways, so you can hear which delivery sounds most natural:
//   a  one sentence at a time (how the app first did it)
//   b  one line at a time, at three speeds (how the app does it now)
//   c  the whole reply in one go
//
//   node tools/voice-reply-test.js <packDir> <outDir> [--voice am_echo]
//
// Then tell Claude which file sounds best (for example "b at 1.0" or "c"), and what is still off.
const fs = require('fs');
const path = require('path');
const { createPhonemizer } = require('../src/voice/phonemes');
const Text = require('../src/voice/text');
const { KOKORO_ID } = require('../src/voice/engine');
const { writeWav } = require('./wav');
const Worry = require('../src/worry');

function arg(name, dflt) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : dflt; }

// Exactly what the buddy showed on screen.
const SCREENSHOT = {
  lang: 'en',
  opener: '*chews thoughtfully*',
  reflect: '"i want to continue our previous conversation"... gone. I ate it.',
  comfort: "You're carrying more than people can see. It makes total sense to feel this way.",
  step: 'Put on one song you love and do nothing else for its whole length.',
  ask: 'Is this a today-worry or a someday-worry?',
};

(async () => {
  const [packDir, outDir] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--'));
  if (!packDir || !outDir) { console.error('usage: node tools/voice-reply-test.js <packDir> <outDir> [--voice am_echo]'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  const voice = arg('voice', 'am_echo');

  let dictionary;
  try { const m = await import('cmu-pronouncing-dictionary'); dictionary = m.dictionary || m.default; }
  catch { console.error('Missing dictionary. Run:  npm install'); process.exit(1); }
  const phon = createPhonemizer(dictionary);

  const { env } = await import('@huggingface/transformers');
  env.allowRemoteModels = false; env.allowLocalModels = true;
  env.localModelPath = path.join(packDir, 'models');
  const { KokoroTTS } = await import('kokoro-js');
  const tts = await KokoroTTS.from_pretrained(KOKORO_ID, { dtype: 'fp32', device: 'cpu' });
  await tts.generate('Hi.', { voice, speed: 1 }); // warm up

  async function say(text, speed) {
    const { input_ids } = tts.tokenizer(phon.phonemize(text).ps, { truncation: true });
    return (await tts.generate_from_ids(input_ids, { voice, speed })).audio;
  }
  function join(parts) { // [{ pcm, pauseMs }]
    const gaps = parts.map((p) => new Float32Array(Math.round(24000 * (p.pauseMs || 0) / 1000)));
    const total = parts.reduce((n, p, i) => n + p.pcm.length + gaps[i].length, 0);
    const out = new Float32Array(total); let at = 0;
    parts.forEach((p, i) => { out.set(p.pcm, at); at += p.pcm.length; out.set(gaps[i], at); at += gaps[i].length; });
    return out;
  }

  const replies = {
    screenshot: SCREENSHOT,
    generated: Worry.respond('my boss shouted at me in front of everyone today', 'Rohit', 'en', 'male'),
  };
  for (const [name, reply] of Object.entries(replies)) {
    const lines = Text.spokenLines(reply);
    console.log(`\n=== ${name} ===\n` + lines.map((l) => '  ' + l).join('\n'));
    const save = (tag, pcm) => { writeWav(path.join(outDir, `${name}-${tag}.wav`), pcm, 24000); console.log('  wrote', `${name}-${tag}.wav`); };

    // a: one sentence at a time, 350 ms between sentences, 700 ms between lines
    const parts = [];
    for (const l of lines) {
      const ss = Text.splitSentences(l);
      for (let i = 0; i < ss.length; i++) parts.push({ pcm: await say(ss[i], 0.9), pauseMs: i < ss.length - 1 ? 350 : 700 });
    }
    save('a-per-sentence', join(parts));

    // b: one line at a time, three speeds
    for (const speed of [0.9, 1.0, 1.1]) {
      const bp = [];
      for (const c of Text.chunkLines(lines)) bp.push({ pcm: await say(c.text, speed), pauseMs: c.pause });
      save(`b-per-line-${speed}`, join(bp));
    }

    // c: the whole reply in one go
    save('c-whole-reply', await say(lines.join(' '), 1.0));
  }
  console.log(`\nWAVs in ${path.resolve(outDir)}. Listen to a, then b (three speeds), then c. Tell Claude which sounds best.`);
})().catch((e) => { console.error(e); process.exit(1); });
