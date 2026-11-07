// English text to Kokoro-ready phonemes, with no GPL code in the path.
//
// kokoro-js normally phonemizes with the `phonemizer` npm package, which embeds
// eSpeak NG (GPL-3.0). This module replaces it: a CMUdict style dictionary
// (word -> "HH AH0 L OW1") goes in, IPA in the shape Kokoro was fed from eSpeak
// comes out ("həlˈoʊ, wˈɜːld!"). Pure function: the dictionary is passed in, so
// it is testable without any model and swappable without touching this file.

const ARPA = {
  AA: 'ɑː', AE: 'æ', AH: 'ʌ', AO: 'ɔː', AW: 'aʊ', AY: 'aɪ', B: 'b', CH: 'tʃ', D: 'd', DH: 'ð',
  EH: 'ɛ', ER: 'ɜː', EY: 'eɪ', F: 'f', G: 'ɡ', HH: 'h', IH: 'ɪ', IY: 'iː', JH: 'dʒ', K: 'k',
  L: 'l', M: 'm', N: 'n', NG: 'ŋ', OW: 'oʊ', OY: 'ɔɪ', P: 'p', R: 'ɹ', S: 's', SH: 'ʃ', T: 't',
  TH: 'θ', UH: 'ʊ', UW: 'uː', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};
const VOWEL = new Set(['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW']);

// One-syllable words that are not stressed in running speech.
const FUNCTION_WORDS = new Set((
  'a an the and or but nor so to of in on at by for from with as into onto up if than that this ' +
  'is am are was were be been it its i me my we us our you your he him his she her they them their ' +
  'can could will would shall should do does did has have had not no ' +
  "i'm i'll i've i'd you're you'll you've you'd we're we'll we've they're they'll it's he's she's that's what's let's there's"
).split(' '));

// Words the dictionary gets wrong for us. Lowercase key, IPA value.
const BUILT_IN_OVERRIDES = {
  ...require('./characters').sayMap(),   // Mochi, Cinder, Mist, Dusk, Hope
  'mo-chee': 'mˈoʊtʃi',
  icall: 'ˈaɪkɔːl',                 // helpline name
  to: 'tə', of: 'əv',               // reduced, as people say them
};

// Short capitals that are really spelled out. Other 2-3 capital words are spelled only if the
// dictionary does not know them as a word ("YO" and "GO" are words, "XQZ" is not).
const ACRONYMS = new Set(['US', 'UK', 'EU', 'UN', 'AI', 'HR', 'TV', 'PC', 'OK', 'ID', 'PM', 'CV', 'CEO', 'ATM', 'FAQ', 'USA', 'UAE', 'DIY']);

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
  'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberWords(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 ? t + ' ' + ONES[n % 10] : t;
}

// "HH AH0 L OW1" -> "həlˈoʊ". The stress mark sits right before the vowel, as eSpeak writes it.
function fromArpabet(pron, { demote = false } = {}) {
  let out = '';
  for (const tok of String(pron).trim().split(/\s+/)) {
    const m = /^([A-Z]+)([012])?$/.exec(tok);
    if (!m || !ARPA[m[1]]) continue;
    const [, ph, stress] = m;
    if (!VOWEL.has(ph)) { out += ARPA[ph]; continue; }
    if (stress === '0' && ph === 'IY') out += 'i'; // happy, really: short, not "ee"
    else if (stress === '0' && ph === 'AH') out += 'ə';
    else if (stress === '0' && ph === 'ER') out += 'ɚ';
    else if (stress === '1' && !demote) out += 'ˈ' + ARPA[ph];
    else if (stress === '2') out += 'ˌ' + ARPA[ph];
    else out += ARPA[ph];
  }
  return out;
}

// Crude letter-to-sound for words nobody listed. Rare words only; they are reported.
const LTS_RULES = [
  ['tch', 'tʃ'], ['sh', 'ʃ'], ['ch', 'tʃ'], ['th', 'θ'], ['ph', 'f'], ['ng', 'ŋ'], ['ck', 'k'], ['qu', 'kw'],
  ['wh', 'w'], ['wr', 'ɹ'], ['kn', 'n'], ['oo', 'uː'], ['ee', 'iː'], ['ea', 'iː'], ['ai', 'eɪ'], ['ay', 'eɪ'],
  ['oa', 'oʊ'], ['ou', 'aʊ'], ['ow', 'oʊ'], ['oi', 'ɔɪ'], ['oy', 'ɔɪ'], ['ie', 'iː'], ['ar', 'ɑːɹ'], ['or', 'ɔːɹ'],
  ['a', 'æ'], ['b', 'b'], ['d', 'd'], ['e', 'ɛ'], ['f', 'f'], ['g', 'ɡ'], ['h', 'h'], ['i', 'ɪ'], ['j', 'dʒ'],
  ['k', 'k'], ['l', 'l'], ['m', 'm'], ['n', 'n'], ['o', 'ɑː'], ['p', 'p'], ['q', 'k'], ['r', 'ɹ'], ['s', 's'],
  ['t', 't'], ['u', 'ʌ'], ['v', 'v'], ['w', 'w'], ['x', 'ks'], ['y', 'j'], ['z', 'z'], ['c', 'k'],
];
const IPA_VOWEL = /[æɑɔɛɪʌʊəɚeoiu]/;

function letterToSound(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length > 2 && w.endsWith('e') && !/[aeiou]$/.test(w.slice(0, -1))) w = w.slice(0, -1); // silent e
  let out = '', i = 0;
  while (i < w.length) {
    const rule = LTS_RULES.find(([g]) => w.startsWith(g, i));
    if (!rule) { i++; continue; }
    let [g, p] = rule;
    if (g === 'c' || g === 'g') p = /[eiy]/.test(w[i + 1] || '') ? (g === 'c' ? 's' : 'dʒ') : p;
    if (g === 'y' && i > 0) p = 'ɪ';
    out += p; i += g.length;
  }
  const at = out.search(IPA_VOWEL);
  return at < 0 ? out : out.slice(0, at) + 'ˈ' + out.slice(at);
}

// Adds the plural / possessive ending to an already phonemized word.
function plural(ipa) {
  if (/(?:[szʃʒ]|tʃ|dʒ)$/.test(ipa)) return ipa + 'ɪz';
  if (/[ptkfθ]$/.test(ipa)) return ipa + 's';
  return ipa + 'z';
}

function createPhonemizer(dict, { overrides = {} } = {}) {
  const over = { ...BUILT_IN_OVERRIDES, ...overrides };
  const lookup = (w) => {
    if (Object.prototype.hasOwnProperty.call(dict, w)) return fromArpabet(dict[w], { demote: FUNCTION_WORDS.has(w) });
    return null;
  };

  // Returns { ipa, known }. Unknown words are guessed and flagged.
  function word(raw, oov) {
    const w = raw.toLowerCase();
    if (over[w] !== undefined) return over[w];
    let p = lookup(w);
    if (p !== null) return p;
    if (w.includes('-')) return w.split('-').filter(Boolean).map((part) => word(part, oov)).join(' ');
    const poss = /^(.+)'s$/.exec(w);
    const compound = () => {          // helpline = help + line
      for (let i = 3; i <= w.length - 3; i++) {
        const a = lookup(w.slice(0, i)), b = lookup(w.slice(i));
        if (a !== null && b !== null) return a + b.replace('ˈ', 'ˌ');
      }
      return null;
    };
    const base = poss ? poss[1] : w.endsWith('es') && lookup(w.slice(0, -2)) !== null ? w.slice(0, -2)
      : w.endsWith('s') ? w.slice(0, -1) : null;
    if (base && (over[base] !== undefined || lookup(base) !== null)) {
      return plural(over[base] !== undefined ? over[base] : lookup(base));
    }
    const c = compound();
    if (c !== null) return c;
    oov.add(w);
    return letterToSound(w);
  }

  function phonemize(text) {
    const oov = new Set();
    const src = String(text == null ? '' : text).replace(/[’‘]/g, "'").replace(/[“”«»"]/g, ' ');
    const tokens = src.match(/[A-Za-z]+(?:['-][A-Za-z]+)*|\d+|[.,!?;:…—]|\S/g) || [];
    // A run of capitalised words is shouting, not acronyms; a lone "US" is an acronym.
    const caps = tokens.filter((t) => /^[A-Za-z]{2,}$/.test(t));
    const shouting = caps.length >= 2 && caps.every((t) => t === t.toUpperCase());
    let out = '', needSpace = false;
    const add = (piece) => { out += (needSpace ? ' ' : '') + piece; needSpace = true; };
    for (const t of tokens) {
      if (/^\d+$/.test(t)) {
        if (t.length <= 2) for (const n of numberWords(Number(t)).split(' ')) add(word(n, oov));
        else for (const d of t) add(word(ONES[Number(d)], oov));
      } else if (!shouting && /^[A-Z]{2,3}$/.test(t) && over[t.toLowerCase()] === undefined
        && (ACRONYMS.has(t) || !Object.prototype.hasOwnProperty.call(dict, t.toLowerCase()))) {
        for (const letter of t) add(word(letter, oov)); // US -> "you ess"
      } else if (/^[A-Za-z]/.test(t)) {
        add(word(t, oov));
      } else if (/^[.,!?;:…]$/.test(t)) {
        out += t; needSpace = true;
      } else if (t === '—') {
        add('—');
      }
      // anything else (stray symbols) is dropped
    }
    return { ps: out.trim(), oov: [...oov] };
  }

  return { phonemize };
}

module.exports = { createPhonemizer, fromArpabet, numberWords, letterToSound };
