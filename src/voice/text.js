// Text helpers for Mochi voice. Pure functions, no audio, no Electron, so the
// same file loads in the play window and in tests.
(function (root) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Sentences end at . ! ? followed by space; digits like 1800-599 never split.
  function splitSentences(text) {
    const t = String(text || '').trim();
    if (!t) return [];
    return t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  }

  // "Mochi" is said "Mo-chee" ("Moh chee" splits into "Mo Chi"). Whole words only.
  function respell(sentence, names = []) {
    let out = String(sentence || '').replace(/\bmochi\b/gi, 'Mo-chee');
    for (const [from, to] of names) out = out.replace(new RegExp('\\b' + esc(from) + '\\b', 'gi'), to);
    return out;
  }

  // Whisper's usual near-misses for the buddy's name.
  // `heard` is [{ to, heard: ['near miss', ...] }], see characters.js.
  function fixTranscript(raw, names = [], heard = []) {
    let out = String(raw || '').replace(/\b(?:mo[\s-]?chi|mo[\s-]?chee|mochie|mochy)\b/gi, 'Mochi');
    for (const n of names) out = out.replace(new RegExp('\\b' + esc(n) + '\\b', 'gi'), n);
    for (const h of heard) out = out.replace(new RegExp('\\b(?:' + h.heard.map(esc).join('|') + ')\\b', 'gi'), h.to);
    return out;
  }

  // What the reply shows on screen, in screen order. English only: Hindi and
  // Hinglish stay on text.
  function replyLines(r) {
    if (!r || r.lang !== 'en') return [];
    const help = (r.helplines || []).map((h) => `${h.name}, ${h.number}`);
    return [r.opener, r.reflect, r.comfort, ...help, r.step, r.ask]
      .map((s) => String(s || '').trim()).filter(Boolean);
  }

  root.VoiceText = { splitSentences, respell, fixTranscript, replyLines };
  if (typeof module !== 'undefined') module.exports = root.VoiceText;
})(typeof window !== 'undefined' ? window : globalThis);
