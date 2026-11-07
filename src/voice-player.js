// Plays the audio chunks the voice process sends, in the play window.
// Only audio buffers arrive here: no model code ever runs in a window.
(function (root) {
  function createPlayer(makeContext) {
    let ctx = null;
    let nextAt = 0;
    const active = new Set();

    function enqueue({ pcm, rate }) {
      if (!ctx) ctx = makeContext();
      const buf = ctx.createBuffer(1, pcm.length, rate);
      buf.copyToChannel(pcm, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      const at = Math.max(ctx.currentTime + 0.05, nextAt);
      nextAt = at + buf.duration;
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
