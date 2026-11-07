// Used twice: loaded as an AudioWorklet module in the hidden recorder window
// (registers the capture processor), and as a plain script / in tests for the
// resampler. Whisper wants 16 kHz mono float samples.
(function (root) {
  function resampleTo16kMono(channels, inRate) {
    const n = channels.length ? channels[0].length : 0;
    if (!n) return new Float32Array(0);
    const mono = new Float32Array(n);
    for (const c of channels) for (let i = 0; i < n; i++) mono[i] += c[i] / channels.length;
    if (inRate === 16000) return mono;
    const outLen = Math.round((n * 16000) / inRate);
    const out = new Float32Array(outLen);
    const step = inRate / 16000;
    for (let i = 0; i < outLen; i++) {
      const pos = i * step, i0 = Math.floor(pos), i1 = Math.min(i0 + 1, n - 1), f = pos - i0;
      out[i] = mono[i0] * (1 - f) + mono[i1] * f;
    }
    return out;
  }

  if (typeof registerProcessor === 'function') {
    registerProcessor('mochi-rec', class extends AudioWorkletProcessor {
      process(inputs) {
        const ch = inputs[0];
        if (ch && ch[0]) this.port.postMessage(ch.map((c) => c.slice()));
        return true;
      }
    });
  }

  root.VoiceResample = { resampleTo16kMono };
  if (typeof module !== 'undefined') module.exports = root.VoiceResample;
})(typeof window !== 'undefined' ? window : globalThis);
