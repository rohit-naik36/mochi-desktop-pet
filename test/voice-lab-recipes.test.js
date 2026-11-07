// node test/voice-lab-recipes.test.js
const assert = require('assert');
const recipes = require('../tools/voice-lab-recipes.json');
const { CHARACTERS } = require('../src/voice/characters');
const PACK_VOICES = new Set(['af_heart', 'af_bella', 'af_alloy', 'bf_isabella', 'am_puck', 'am_echo', 'am_fenrir', 'bm_fable']);

for (const gender of ['female', 'male', 'nonbinary']) {
  assert(recipes[gender], gender);
  assert.deepStrictEqual(Object.keys(recipes[gender]).sort(), CHARACTERS.map((c) => c.id).sort(), gender + ' has every character');
  for (const [id, r] of Object.entries(recipes[gender])) {
    assert(r.mix.length >= 1 && r.mix.length <= 3, `${gender}/${id} mixes 1-3 voices`);
    for (const [voice, weight] of r.mix) {
      assert(PACK_VOICES.has(voice), `${gender}/${id}: ${voice} is not in the pack`);
      assert(weight > 0, `${gender}/${id}: weight`);
    }
    assert(r.pace >= 0.7 && r.pace <= 1.25, `${gender}/${id} pace is sane`);
  }
}
// Characters in one gender must not all sound the same: no two share both mix and pace.
for (const gender of Object.keys(recipes).filter((k) => !k.startsWith('_'))) {
  const keys = Object.values(recipes[gender]).map((r) => JSON.stringify(r));
  assert.strictEqual(new Set(keys).size, keys.length, gender + ' recipes are all different');
}
console.log('voice-lab-recipes ok');
