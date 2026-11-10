// Main-process side of voice input: owns the utility process that holds the
// listening model. The model loads on first use and the process is stopped
// after idleMs unused.
function createHost({ spawn, idleMs = 600000, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let ch = null;
  let nextId = 1;
  let idle = null;
  const pending = new Map(); // id -> { resolve, reject }

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

  async function transcribe(samples) {
    const r = await request({ type: 'stt', samples });
    return String(r.text || '');
  }

  function shutdown() {
    if (idle) { clearTimer(idle); idle = null; }
    rejectAll('voice process stopped');
    if (ch) { const c = ch; ch = null; c.kill(); }
  }

  return { transcribe, shutdown, isLoaded: () => !!ch };
}

module.exports = { createHost };
