// node test/voice-transcript.test.js
// What the listening model writes is repaired for Mochi's and the buddies' names, and nothing else.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Characters = require('../src/voice/characters');
const { fixTranscript } = require('../src/voice/transcript');

// The list here and the SKINS list in main.js must match, so a new buddy cannot ship without a hearing entry.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
  const block = src.slice(src.indexOf('const SKINS = ['), src.indexOf('];', src.indexOf('const SKINS = [')));
  const skins = [...block.matchAll(/id: '([^']+)', name: '([^']+)'/g)].map((m) => ({ id: m[1], name: m[2] }));
  assert(skins.length >= 5, 'found the SKINS list');
  assert.deepStrictEqual(Characters.CHARACTERS.map((c) => ({ id: c.id, name: c.name })), skins);
}

const fixes = Characters.heardFixes();
assert.strictEqual(fixTranscript('hey mochie i feel bad'), 'hey Mochi i feel bad');
for (const w of ['mo chi', 'mochee', 'mochy', 'Mo-chee']) assert.strictEqual(fixTranscript('hi ' + w + ' ok'), 'hi Mochi ok', w);
assert.strictEqual(fixTranscript('hey sinder i feel bad', [], fixes), 'hey Cinder i feel bad');
assert.strictEqual(fixTranscript('cynder and cindar', [], fixes), 'Cinder and Cinder');
// Only names that are not ordinary words get repaired, so "I hope" stays "I hope".
for (const plain of ['I hope the mist lifts at dusk', 'she is a cinder block fan', 'my hope is fading']) {
  assert.strictEqual(fixTranscript(plain, [], fixes), plain, 'real words untouched: ' + plain);
}
for (const c of Characters.CHARACTERS) {
  assert(Array.isArray(c.heard), c.name + ' has a heard list');
  assert(!('say' in c), c.name + ' has no speaking data any more');
}
// Names passed in are matched whole-word, case-insensitively.
assert.strictEqual(fixTranscript('tell cinder hi', ['Cinder']), 'tell Cinder hi');
assert.strictEqual(fixTranscript(''), '');
assert.strictEqual(fixTranscript(null), '');
console.log('voice-transcript ok');
