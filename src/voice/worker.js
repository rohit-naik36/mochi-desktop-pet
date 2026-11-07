// Entry point of the voice utility process (started with utilityProcess.fork).
// argv[2] = voice pack folder. Messages: see src/voice/host.js.
const { createEngine } = require('./engine');

const port = process.parentPort;
let engine = null;
const get = () => engine || (engine = createEngine(process.argv[2]));

port.on('message', async (e) => {
  const m = e.data;
  if (!m || m.type === 'cancel') return; // a running synthesis finishes; the host drops its result
  try {
    const eng = await get();
    if (m.type === 'tts') {
      const r = await eng.tts(m.text, m.voice, m.speed);
      port.postMessage({ id: m.id, type: 'audio', pcm: r.pcm, rate: r.rate });
    } else if (m.type === 'stt') {
      port.postMessage({ id: m.id, type: 'text', text: await eng.stt(m.samples) });
    }
  } catch (err) {
    engine = null; // reload on the next request
    port.postMessage({ id: m.id, type: 'error', message: String((err && err.message) || err).slice(0, 160) });
  }
});
