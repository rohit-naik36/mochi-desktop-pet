// Main-process side of voice: owns the utility process that holds the models.
// Models load on first use and the process is stopped after idleMs unused.
const MAX_RTF = 1.0;       // synthesis must be faster than real time
const MAX_FIRST_MS = 2000; // and the first sentence must start within 2 seconds
const TEST_LINE = 'Hello, I am here with you.';

function createHost({ spawn, idleMs = 600000, setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now }) {
  let ch = null;
  let nextId = 1;
  let idle = null;
  const pending = new Map(); // id -> { resolve, reject }
  let current = null;        // the speech in progress: { cancelled }

  function rejectAll(msg) {
    for (const p of pending.values()) p.reject(new Error(msg));
    pending.clear();
  }

  function ensure() {
    if (ch) return ch;
    ch = spawn();
    ch.on('message', (m) => {
      const p = pending.get(m && m.id);
      if (!p) return;
      pending.delete(m.id);
      if (m.type === 'error') p.reject(new Error(m.message || 'voice failed'));
      else p.resolve(m);
    });
    ch.on('exit', () => { ch = null; rejectAll('voice process stopped'); });
    return ch;
  }

  function armIdle() {
    if (idle) clearTimer(idle);
    idle = setTimer(() => {
      idle = null;
      if (pending.size) return armIdle(); // still working
      if (ch) { const c = ch; ch = null; c.kill(); }
    }, idleMs);
  }

  function request(msg) {
    const c = ensure();
    armIdle();
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      msg.id = id;
      c.postMessage(msg);
    });
  }

  async function speak({ sentences, voice, speed, onAudio }) {
    if (current) current.cancelled = true;
    const mine = { cancelled: false };
    current = mine;
    for (let i = 0; i < sentences.length; i++) {
      if (mine.cancelled) return;
      let reply;
      try { reply = await request({ type: 'tts', text: sentences[i], voice, speed }); }
      catch (e) { if (mine.cancelled) return; throw e; }
      if (mine.cancelled) return;
      onAudio({ pcm: reply.pcm, rate: reply.rate, index: i, last: i === sentences.length - 1 });
    }
    if (current === mine) current = null;
  }

  function stop() {
    if (!current) return;
    current.cancelled = true;
    current = null;
    if (ch) ch.postMessage({ type: 'cancel' });
  }

  async function transcribe(samples) {
    const r = await request({ type: 'stt', samples });
    return String(r.text || '');
  }

  // First call loads the models (not timed). Then one short sentence is timed.
  async function speedTest(voice, speed) {
    await request({ type: 'tts', text: 'Hi.', voice, speed });
    const t0 = now();
    const r = await request({ type: 'tts', text: TEST_LINE, voice, speed });
    const firstMs = now() - t0;
    const audioMs = (r.pcm.length / r.rate) * 1000;
    const rtf = audioMs ? firstMs / audioMs : Infinity;
    return { ok: rtf < MAX_RTF && firstMs < MAX_FIRST_MS, rtf, firstMs };
  }

  function shutdown() {
    if (idle) { clearTimer(idle); idle = null; }
    current = null;
    rejectAll('voice process stopped');
    if (ch) { const c = ch; ch = null; c.kill(); }
  }

  return { speak, stop, transcribe, speedTest, shutdown, isLoaded: () => !!ch };
}

module.exports = { createHost, MAX_RTF, MAX_FIRST_MS };
