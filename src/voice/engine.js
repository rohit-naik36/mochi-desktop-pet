// The real engines, loaded ONLY inside the voice utility process, from the
// voice pack on disk. Never required by the main process or any window.
// Pack layout (written by tools/make-voice-pack.js):
//   <packDir>/models/onnx-community/Kokoro-82M-v1.0-ONNX/...   (fp32 + voices)
//   <packDir>/models/Xenova/whisper-base.en/...
const path = require('path');

const KOKORO_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const WHISPER_ID = 'Xenova/whisper-base.en';

async function createEngine(packDir) {
  const { env, pipeline } = await import('@huggingface/transformers');
  env.allowRemoteModels = false; // this process can never download anything
  env.allowLocalModels = true;
  env.localModelPath = path.join(packDir, 'models');
  let tts = null, asr = null;

  return {
    async tts(text, voice, speed) {
      if (!tts) {
        const { KokoroTTS } = await import('kokoro-js');
        tts = await KokoroTTS.from_pretrained(KOKORO_ID, { dtype: 'fp32', device: 'cpu' });
      }
      const audio = await tts.generate(text, { voice, speed });
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
