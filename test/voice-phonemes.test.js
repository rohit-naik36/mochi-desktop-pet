// node test/voice-phonemes.test.js
// Permissive English phonemizer (CMUdict style dictionary in, Kokoro-ready IPA out).
const assert = require('assert');
const { createPhonemizer, fromArpabet, numberWords } = require('../src/voice/phonemes');

const DICT = {
  hello: 'HH AH0 L OW1', yo: 'Y OW1', world: 'W ER1 L D', the: 'DH AH0', dog: 'D AO1 G', cat: 'K AE1 T',
  dish: 'D IH1 SH', is: 'IH1 Z', to: 'T UW1', i: 'AY1', am: 'AE1 M', here: 'HH IY1 R',
  nine: 'N AY1 N', eight: 'EY1 T', twelve: 'T W EH1 L V', "don't": 'D OW1 N T', well: 'W EH1 L',
  being: 'B IY1 IH0 NG', us: 'AH1 S', u: 'Y UW1', s: 'EH1 S', it: 'IH1 T', happy: 'HH AE1 P IY0',
  help: 'HH EH1 L P', line: 'L AY1 N', "you're": 'Y UH1 R', mo: 'M OW1', chee: 'CH IY1', reader: 'R IY1 D ER0', sixteen: 'S IH0 K S T IY1 N',
};
const P = createPhonemizer(DICT);
const ps = (t) => P.phonemize(t).ps;

// ARPAbet to IPA, stress mark goes right before the vowel.
assert.strictEqual(fromArpabet('HH AH0 L OW1'), 'həlˈoʊ');
assert.strictEqual(fromArpabet('W ER1 L D'), 'wˈɜːld');
assert.strictEqual(fromArpabet('R IY1 D ER0'), 'ɹˈiːdɚ');
assert.strictEqual(fromArpabet('S IH0 K S T IY1 N'), 'sɪkstˈiːn');
assert.strictEqual(fromArpabet('B IY1 IH0 NG'), 'bˈiːɪŋ');
assert.strictEqual(fromArpabet('HH AE1 P IY0'), 'hˈæpi', 'word-final unstressed y is short');
assert.strictEqual(fromArpabet('AH2 B AW1 T'), 'ˌʌbˈaʊt');

// Sentences keep their punctuation, attached the way Kokoro expects.
assert.strictEqual(ps('Hello, world!'), 'həlˈoʊ, wˈɜːld!');
assert.strictEqual(ps('  hello   world  '), 'həlˈoʊ wˈɜːld');
assert.strictEqual(ps('"Hello?" she said.').startsWith('həlˈoʊ?'), true);

// One-syllable function words lose their stress so speech is not choppy.
assert.strictEqual(ps('the dog'), 'ðə dˈɔːɡ');
assert.strictEqual(ps('is'), 'ɪz');
assert.strictEqual(ps('to dog'), 'tə dˈɔːɡ');
assert(!ps("you're").includes('ˈ'), "you're is unstressed");

// Acronyms are spelled out; ordinary words in capitals are not; shouting is left alone.
assert.strictEqual(ps('US'), 'jˈuː ˈɛs');
assert.strictEqual(ps('us'), 'ʌs');
assert.strictEqual(ps('call the US now').split(' ')[2], 'jˈuː');
assert.strictEqual(ps('IT IS'), 'ɪt ɪz', 'all-caps text is not spelled out');
assert.strictEqual(ps('YO, hello'), 'jˈoʊ, həlˈoʊ', 'a short capitalised word in the dictionary is a word, not an acronym');
assert.strictEqual(ps('XQZ').split(' ').length, 3, 'unknown short capitals are spelled');

// Unknown compounds are built from two known words; app words come from overrides.
{
  const r = P.phonemize('helpline');
  assert.strictEqual(r.ps, 'hˈɛlplˌaɪn');
  assert.deepStrictEqual(r.oov, []);
}
assert.strictEqual(ps('iCall'), 'ˈaɪkɔːl');

// Plurals and possessives of known words.
assert.strictEqual(ps('cats'), 'kˈæts');
assert.strictEqual(ps("dog's"), 'dˈɔːɡz');
assert.strictEqual(ps('dishes'), 'dˈɪʃɪz');
assert.strictEqual(ps("don't"), 'dˈoʊnt');

// Hyphenated: whole word if known or overridden, otherwise the parts.
assert.strictEqual(ps('well-being'), 'wˈɛl bˈiːɪŋ');
assert.strictEqual(ps('Mo-chee'), 'mˈoʊtʃi');
assert.strictEqual(ps('Mochi'), 'mˈoʊtʃi');
assert.strictEqual(ps('Hi, Mo-chee.'.replace('Hi', 'hello')), 'həlˈoʊ, mˈoʊtʃi.');

// Numbers: 1-2 digits as a number, 3+ digits (phone numbers, helplines) digit by digit.
assert.strictEqual(numberWords(12), 'twelve');
assert.strictEqual(numberWords(0), 'zero');
assert.strictEqual(numberWords(45), 'forty five');
assert.strictEqual(numberWords(99), 'ninety nine');
assert.strictEqual(ps('12'), 'twˈɛlv');
const digits = ps('988');
assert.strictEqual(digits.split(' ').length, 3, 'one word per digit');
assert(digits.startsWith('nˈaɪn'));
assert.strictEqual(ps('9152987821').split(' ').length, 10);

// Unknown words still get something to say, and are reported.
{
  const r = P.phonemize('hello zorp');
  assert(r.ps.startsWith('həlˈoʊ ') && r.ps.length > 'həlˈoʊ '.length);
  assert.deepStrictEqual(r.oov, ['zorp']);
  assert.deepStrictEqual(P.phonemize('hello world').oov, []);
}

// Every symbol produced is a single IPA character Kokoro knows (spot check the set).
{
  const allowed = new Set([...'abdfhijklmnpstuvwzæɑɔɛɜɡɪɹʃʒʊʌðŋθəɚeoˈˌː.,!?;:— ']);
  for (const t of ['hello, world!', 'the dog is here', 'zorp quux flib', "dog's dishes", '988 and 12']) {
    for (const ch of ps(t)) assert(allowed.has(ch), `unexpected symbol ${JSON.stringify(ch)} in ${t}`);
  }
}

// Empty and junk input.
assert.strictEqual(ps(''), '');
assert.strictEqual(ps('   '), '');
assert.strictEqual(ps(null), '');

// Custom overrides win over the dictionary.
assert.strictEqual(createPhonemizer(DICT, { overrides: { dog: 'dɔɡi' } }).phonemize('dog').ps, 'dɔɡi');

console.log('voice-phonemes ok');
