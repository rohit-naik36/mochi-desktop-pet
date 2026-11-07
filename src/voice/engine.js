// The real engines, loaded ONLY inside the voice utility process, from the
// voice pack on disk. Never required by the main process or any window.
// Pack layout (written by tools/make-voice-pack.js):
//   <packDir>/models/onnx-community/Kokoro-82M-v1.0-ONNX/...   (fp32 + voices)
//   <packDir>/models/Xenova/whisper-base.en/...
const path = require('path');
const { createPhonemizer } = require('./phonemes');

const KOKORO_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const WHISPER_ID = 'Xenova/whisper-base.en';

async function createEngine(packDir) {
  const { env, pipeline } = await import('@huggingface/transformers');
  env.allowRemoteModels = false; // this process can never download anything
  env.allowLocalModels = true;
  env.localModelPath = path.join(packDir, 'models');
  let tts = null, asr = null, phon = null;

  // Our own phonemizer (no GPL code), built on the CMU pronouncing dictionary.
  async function phonemizer() {
    if (phon) return phon;
    try {
      const m = await import('cmu-pronouncing-dictionary');
      phon = createPhonemizer(m.dictionary || m.default);
    } catch (e) {
      console.error('[voice] pronunciation dictionary missing, using the built-in phonemizer:', e && e.message);
      phon = { builtIn: true };
    }
    return phon;
  }

  return {
    async tts(text, voice, speed) {
      if (!tts) {
        const { KokoroTTS } = await import('kokoro-js');
        tts = await KokoroTTS.from_pretrained(KOKORO_ID, { dtype: 'fp32', device: 'cpu' });
      }
      const p = await phonemizer();
      let audio;
      if (p.builtIn) audio = await tts.generate(text, { voice, speed });
      else {
        const { input_ids } = tts.tokenizer(p.phonemize(text).ps, { truncation: true });
        audio = await tts.generate_from_ids(input_ids, { voice, speed });
      }
      return { pcm: audio.audio, rate: audio.sampling_rate };
    },
    async stt(samples) {
      if (!asr) asr = await pipeline('automatic-speech-recognition', WHISPER_ID, { device: 'cpu' });
      const out = await asr(samples);
      return String((out && out.text) || '').trim();
    },
  };
}

module.exports = { createEngine, KOKORO_ID, WHISPER_ID };
