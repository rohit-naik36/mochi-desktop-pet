// Captures the microphone while the button is held, then hands 16 kHz mono
// samples to the main process. Nothing is written to disk; the samples live
// in memory only until they are transcribed.
let stream = null, ctx = null, node = null, chunks = [], starting = null;

const codeFor = (e) => (e && e.name === 'NotFoundError' ? 'no-mic' : e && e.name === 'NotAllowedError' ? 'denied' : e && e.name === 'NotReadableError' ? 'busy' : 'failed');

function release() {
  if (stream) for (const t of stream.getTracks()) t.stop();
  if (node) node.disconnect();
  const c = ctx;
  stream = null; node = null; ctx = null;
  if (c) c.close().catch(() => {});
}

async function begin() {
  chunks = [];
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    ctx = new AudioContext({ sampleRate: 16000 });
    await ctx.audioWorklet.addModule('recorder-worklet.js');
    node = new AudioWorkletNode(ctx, 'mochi-rec');
    node.port.onmessage = (e) => chunks.push(e.data);
    ctx.createMediaStreamSource(stream).connect(node);
    return true;
  } catch (e) {
    release();
    window.recorder.error(codeFor(e));
    return false;
  }
}

window.recorder.onStart(() => { starting = begin(); });

window.recorder.onStop(async () => {
  const ok = starting ? await starting : false;
  starting = null;
  if (!ok) return;
  const rate = ctx ? ctx.sampleRate : 16000;
  release();
  const frames = chunks; chunks = [];
  const perChannel = [];
  for (const f of frames) f.forEach((c, i) => { (perChannel[i] || (perChannel[i] = [])).push(c); });
  const channels = perChannel.map((parts) => {
    const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  });
  window.recorder.done(window.VoiceResample.resampleTo16kMono(channels, rate));
});
