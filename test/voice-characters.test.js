// node test/voice-characters.test.js
// Every buddy the app can show has to be spoken (and heard) properly, not just Mochi.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Characters = require('../src/voice/characters');
const { createPhonemizer } = require('../src/voice/phonemes');
const T = require('../src/voice/text');

// The list in main.js and the list here must match, so a new buddy cannot ship without a voice entry.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
  const block = src.slice(src.indexOf('const SKINS = ['), src.indexOf('];', src.indexOf('const SKINS = [')));
  const skins = [...block.matchAll(/id: '([^']+)', name: '([^']+)'/g)].map((m) => ({ id: m[1], name: m[2] }));
  assert(skins.length >= 5, 'found the SKINS list');
  assert.deepStrictEqual(Characters.CHARACTERS.map((c) => ({ id: c.id, name: c.name })), skins);
}

// Said the same way with no dictionary help at all: the name is pinned, not left to chance.
const P = createPhonemizer({});
const SAY = { Mochi: 'mˈoʊtʃi', Cinder: 'sˈɪndɚ', Mist: 'mˈɪst', Dusk: 'dˈʌsk', Hope: 'hˈoʊp' };
for (const c of Characters.CHARACTERS) {
  assert.strictEqual(c.say, SAY[c.name], c.name + ' pronunciation');
  assert.strictEqual(P.phonemize(c.name).ps, c.say, c.name);
  assert.strictEqual(P.phonemize(c.name.toUpperCase()).ps, c.say, c.name + ' in capitals');
  assert.strictEqual(P.phonemize(`a, ${c.name}!`).ps.endsWith(c.say + '!'), true, c.name + ' before punctuation');
  assert(/[zsɪ]$/.test(P.phonemize(c.name + "'s").ps), c.name + " possessive");
  assert(!P.phonemize(c.name).oov.length, c.name + ' is never reported as unknown');
}
assert.strictEqual(P.phonemize("Cinder's").ps, 'sˈɪndɚz');
assert.strictEqual(P.phonemize('Mo-chee').ps, 'mˈoʊtʃi');

// Transcript fixes: only names that are NOT ordinary words get repaired, so "I hope" stays "I hope".
const fixes = Characters.heardFixes();
assert.strictEqual(T.fixTranscript('hey sinder i feel bad', [], fixes), 'hey Cinder i feel bad');
assert.strictEqual(T.fixTranscript('hey mochie i feel bad', [], fixes), 'hey Mochi i feel bad');
for (const plain of ['I hope the mist lifts at dusk', 'she is a cinder block fan', 'my hope is fading']) {
  assert.strictEqual(T.fixTranscript(plain, [], fixes), plain, 'real words untouched: ' + plain);
}
assert.strictEqual(T.fixTranscript(''), '');

console.log('voice-characters ok');
