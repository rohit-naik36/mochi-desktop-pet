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

  // A persona line made fit to say: placeholders filled, *stage directions* and emoji dropped,
  // "GOOO" shortened, a full stop added. '' if there is nothing to say (or it is Hindi).
  function speakable(line, vars = {}) {
    let s = String(line == null ? '' : line);
    if (/[\u0900-\u097F]/.test(s)) return '';
    s = s.replace(/\*[^*]*\*/g, ' ')
      .replace(/\{greet\}/g, vars.greet || '')
      .replace(/\{n\}/g, vars.name ? ', ' + vars.name : '')
      .replace(/\{pet\}/g, vars.pet || '')
      .replace(/\{[a-z]+\}/gi, ' ')
      .replace(/\b([A-Za-z])-\1/gi, '$1')                      // "H-hi" -> "Hi"
      .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]+/gu, '\u0001') // emoji marks a pause
      .replace(/\.{3,}|…/g, '…')
      .replace(/[A-Za-z']+/g, (w) => {
        if (!/(.)\1\1/i.test(w)) return w;
        const one = w.replace(/(.)\1{2,}/gi, '$1');
        return w === w.toUpperCase() ? one[0].toUpperCase() + one.slice(1).toLowerCase() : one;
      })
      .replace(/([A-Za-z0-9'])\s*\u0001[\s\u0001]*/g, '$1. ').replace(/\u0001+/g, ' ')
      .replace(/\s+/g, ' ').replace(/\s+([.,!?…;:])/g, '$1').replace(/^[\s,.!?…;:]+/, '').trim();
    if (!/[A-Za-z0-9]/.test(s)) return '';
    return /[.!?…]$/.test(s) ? s : s + '.';
  }

  // What the reply shows on screen, in screen order. English only: Hindi and
  // Hinglish stay on text.
  function replyLines(r) {
    if (!r || r.lang !== 'en') return [];
    const help = (r.helplines || []).map((h) => `${h.name}, ${h.number}`);
    return [r.opener, r.reflect, r.comfort, ...help, r.step, r.ask]
      .map((s) => String(s || '').trim()).filter(Boolean);
  }

  root.VoiceText = { splitSentences, respell, fixTranscript, replyLines, speakable };
  if (typeof module !== 'undefined') module.exports = root.VoiceText;
})(typeof window !== 'undefined' ? window : globalThis);
