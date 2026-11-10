// Repairs what the listening model writes: Mochi's name and the buddies' names.
// Pure function, no audio and no Electron, so it is easy to test.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// `names` are whole words to put in their proper case. `heard` is [{ to, heard: ['near miss', ...] }], see characters.js.
function fixTranscript(raw, names = [], heard = []) {
  let out = String(raw || '').replace(/\b(?:mo[\s-]?chi|mo[\s-]?chee|mochie|mochy)\b/gi, 'Mochi');
  for (const n of names) out = out.replace(new RegExp('\\b' + esc(n) + '\\b', 'gi'), n);
  for (const h of heard) out = out.replace(new RegExp('\\b(?:' + h.heard.map(esc).join('|') + ')\\b', 'gi'), h.to);
  return out;
}

module.exports = { fixTranscript };
