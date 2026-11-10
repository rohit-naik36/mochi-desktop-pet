// The real engine, loaded ONLY inside the voice utility process, from the
// voice pack on disk. Never required by the main process or any window.
// Pack layout (written by tools/make-voice-pack.js):
//   <packDir>/models/Xenova/whisper-base.en/...
const path = require('path');

const WHISPER_ID = 'Xenova/whisper-base.en';

async function createEngine(packDir) {
  const { env, pipeline } = await import('@huggingface/transformers');
  env.allowRemoteModels = false; // this process can never download anything
  env.allowLocalModels = true;
  env.localModelPath = path.join(packDir, 'models');
  let asr = null;

  return {
    async stt(samples) {
      if (!asr) asr = await pipeline('automatic-speech-recognition', WHISPER_ID, { device: 'cpu' });
      const out = await asr(samples);
      return String((out && out.text) || '').trim();
    },
  };
}

module.exports = { createEngine, WHISPER_ID };
