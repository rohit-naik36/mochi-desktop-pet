// node test/voice-menu.test.js
const assert = require('assert');
const { voiceMenuModel } = require('../src/voice/menu');

const st = (over = {}, gender = 'female') => ({ petGender: gender, voice: { on: false, voice: null, pace: 'default', ...over } });

{ const m = voiceMenuModel(st(), 'missing');
  assert.strictEqual(m.packAction, 'download'); assert.strictEqual(m.canEnable, false); assert.strictEqual(m.enabled, false); }
{ const m = voiceMenuModel(st(), 'ready');
  assert.strictEqual(m.packAction, 'remove'); assert.strictEqual(m.canEnable, true); }
{ const m = voiceMenuModel(st(), 'partial', true);
  assert.strictEqual(m.packAction, 'downloading'); assert.strictEqual(m.canEnable, false); }
{ const m = voiceMenuModel(st(), 'partial');
  assert.strictEqual(m.packAction, 'download'); }

// voices follow the buddy's gender; checked one is the saved choice, else the first
{ const m = voiceMenuModel(st({}, 'male'), 'ready');
  assert.deepStrictEqual(m.voices.map((v) => v.id), ['puck', 'echo']);
  assert.deepStrictEqual(m.voices.map((v) => v.checked), [true, false]); }
{ const m = voiceMenuModel(st({ voice: 'bella' }, 'female'), 'ready');
  assert.deepStrictEqual(m.voices.map((v) => [v.id, v.checked]), [['heart', false], ['bella', true]]); }
// a saved voice from another gender is not shown as checked; the first is
{ const m = voiceMenuModel(st({ voice: 'puck' }, 'female'), 'ready');
  assert.deepStrictEqual(m.voices.map((v) => v.checked), [true, false]); }
// gender not chosen yet: treated as nonbinary
{ const m = voiceMenuModel(st({}, null), 'ready');
  assert.deepStrictEqual(m.voices.map((v) => v.id), ['fable', 'alloy']); }
assert.strictEqual(voiceMenuModel(st({ pace: 'slower' }), 'ready').pace, 'slower');
assert.strictEqual(voiceMenuModel(st({ on: true }), 'ready').enabled, true);
assert(/Heart/.test(voiceMenuModel(st(), 'ready').voices[0].label));
console.log('voice-menu ok');
