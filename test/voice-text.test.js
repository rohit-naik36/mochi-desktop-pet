// node test/voice-text.test.js
const assert = require('assert');
const V = require('../src/voice/text');

assert.deepStrictEqual(V.splitSentences('Hi there. How are you? Fine!'), ['Hi there.', 'How are you?', 'Fine!']);
assert.deepStrictEqual(V.splitSentences('no punctuation at all'), ['no punctuation at all']);
assert.deepStrictEqual(V.splitSentences('  '), []);
assert.strictEqual(V.splitSentences('Call 1800-599-0019. Or text.').length, 2);

assert.strictEqual(V.respell('Mochi is here, Mochi.'), 'Mo-chee is here, Mo-chee.');
assert.strictEqual(V.respell('mochi'), 'Mo-chee');
assert.strictEqual(V.respell('Mochikins'), 'Mochikins');
assert.strictEqual(V.respell('Hello Cinder', [['Cinder', 'Sin-der']]), 'Hello Sin-der');

assert.strictEqual(V.fixTranscript('hey mochie i feel bad'), 'hey Mochi i feel bad');
for (const w of ['mo chi', 'mochee', 'mochy', 'Mo-chee']) assert.strictEqual(V.fixTranscript('hi ' + w + ' ok'), 'hi Mochi ok', w);
assert.strictEqual(V.fixTranscript(''), '');

const r = { lang: 'en', opener: '', reflect: 'A', comfort: 'B', step: 'C', ask: 'D', helplines: [{ name: 'KIRAN', number: '1' }] };
assert.deepStrictEqual(V.replyLines(r), ['A', 'B', 'KIRAN, 1', 'C', 'D']);
assert.deepStrictEqual(V.replyLines({ ...r, opener: 'Hey.' })[0], 'Hey.');
assert.deepStrictEqual(V.replyLines({ ...r, lang: 'hi' }), []);
assert.deepStrictEqual(V.replyLines({ ...r, lang: 'hinglish' }), []);
assert.deepStrictEqual(V.replyLines({ lang: 'en' }), []);
