// "Shake it out": the small rules behind Mochi's boxing-pad mode. Pure
// functions, no screen and no timers, so they can be tested without a window.
(function (root) {
  const HITS_TARGET = 20;   // the round ends after this many hits...
  const MAX_MS = 40000;     // ...or after this long, whichever comes first

  // Words that say someone is angry or fed up. Whole words only for plain
  // letters, so "mad" never matches inside "made" or "nomad".
  const ANGRY = [
    'angry', 'anger', 'furious', 'livid', 'fuming', 'enraged', 'outraged', 'infuriating', 'irritated', 'irritating',
    'annoyed', 'annoying', 'frustrated', 'frustrating', 'pissed', 'rage', 'hate', 'hated', 'resent', 'fed up',
    'sick of', 'so mad', 'really mad', 'am mad', 'im mad', "i'm mad", 'mad at', 'cant stand', "can't stand", 'had enough',
    'gussa', 'gussa aa', 'gusse', 'ghussa', 'ghusse', 'chidh', 'chid gaya', 'chid gayi', 'bhadak', 'khoon khaul', 'tang aa gaya', 'tang aa gayi', 'nafrat',
    'गुस्सा', 'गुस्से', 'ग़ुस्सा', 'चिढ़', 'चिढ', 'नफ़रत', 'नफरत', 'झल्ला', 'खीज',
  ];

  const normal = (text) => ' ' + String(text || '').toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{M}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ') + ' ';

  function isAngry(text) {
    const t = normal(text);
    return ANGRY.some((w) => (/^[a-z' ]+$/.test(w) ? t.includes(' ' + w + ' ') || (w.indexOf(' ') > -1 && t.includes(' ' + w)) : t.includes(w)));
  }

  // Offer "Shake it out" only after an ordinary reply to someone who sounds
  // angry. Never after the gentle replies (sadness, hopeless words, someone
  // hurt), the crisis reply or good news.
  function shouldOffer(reply, text) {
    if (!reply || reply.serious || reply.gentle || reply.celebrate) return false;
    return isAngry(text);
  }

  // Why a round ends, or null while it carries on.
  function roundEnd({ hits = 0, elapsedMs = 0, doneClicked = false } = {}) {
    if (doneClicked) return 'done';
    if (hits >= HITS_TARGET) return 'target';
    if (elapsedMs >= MAX_MS) return 'time';
    return null;
  }

  // Which pool of cheers to use: warm-up, then sillier, then the last few.
  function stage(hits) {
    if (hits >= HITS_TARGET - 4) return 'c';
    if (hits >= 8) return 'b';
    return 'a';
  }

  // Mochi cheers on every fourth hit, and on each of the last three.
  function cheerNow(hits) {
    return hits > 0 && (hits % 4 === 0 || hits >= HITS_TARGET - 2);
  }

  root.ShakeRules = { isAngry, shouldOffer, roundEnd, stage, cheerNow, HITS_TARGET, MAX_MS };
  if (typeof module !== 'undefined') module.exports = root.ShakeRules;
})(typeof window !== 'undefined' ? window : globalThis);
