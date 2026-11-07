// Plays the audio chunks the voice process sends, in the play window.
// Only audio buffers arrive here: no model code ever runs in a window.
(function (root) {
  function createPlayer(makeContext) {
    let ctx = null;
    let nextAt = 0;
    const active = new Set();

    function enqueue({ pcm, rate, pause = 0 }) {
      if (!ctx) ctx = makeContext();
      // A context created without a click can start suspended, and a suspended one is silent forever.
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        try { Promise.resolve(ctx.resume()).catch(() => {}); } catch { /* try again on the next chunk */ }
      }
      if (!active.size && typeof console !== 'undefined') console.log('[voice-player] chunk', pcm.length, 'samples at', rate, 'Hz, context', ctx.state);
      const buf = ctx.createBuffer(1, pcm.length, rate);
      buf.copyToChannel(pcm, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      const at = Math.max(ctx.currentTime + 0.05, nextAt);
      nextAt = at + buf.duration + pause / 1000; // pause: a breath before the next sentence
      active.add(src);
      src.onended = () => active.delete(src);
      src.start(at);
    }

    function stop() {
      for (const s of active) { try { s.stop(); } catch { /* already ended */ } }
      active.clear();
      nextAt = 0;
    }

    return { enqueue, stop, isPlaying: () => active.size > 0 };
  }

  root.VoicePlayer = typeof root.AudioContext === 'function' ? createPlayer(() => new root.AudioContext()) : null;
  if (typeof module !== 'undefined') module.exports = { createPlayer };
})(typeof window !== 'undefined' ? window : globalThis);
