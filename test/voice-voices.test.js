// node test/voice-voices.test.js
const assert = require('assert');
const V = require('../src/voice/voices');

const ids = (g) => V.voicesFor(g).map((v) => v.id);
assert.deepStrictEqual(ids('female'), ['heart', 'bella']);
assert.deepStrictEqual(ids('male'), ['puck', 'echo']);
assert.deepStrictEqual(ids('nonbinary'), ['fable', 'alloy']);
assert.deepStrictEqual(V.voicesFor('bogus'), []);
assert.deepStrictEqual(V.voicesFor(null), []);
assert.strictEqual(V.speedFor('heart', 'default'), 0.9);
assert.strictEqual(V.speedFor('bella', 'default'), 0.95);
assert.strictEqual(V.speedFor('fable', 'slower'), 0.81);
assert.strictEqual(V.speedFor('nope', 'default'), 0.9);
assert.strictEqual(V.defaultVoice('female'), 'heart');
assert.strictEqual(V.defaultVoice('x'), null);
const spareIds = V.SPARES.map((v) => v.id);
for (const g of ['male', 'female', 'nonbinary']) for (const id of ids(g)) assert(!spareIds.includes(id));
assert.strictEqual(V.byId('fable').kokoro, 'bm_fable');
assert.strictEqual(V.byId('alloy').kokoro, 'af_alloy');
