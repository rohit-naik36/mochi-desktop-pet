// node test/voice-permissions.test.js
const assert = require('assert');
const { createPolicy } = require('../src/voice/permissions');

const mk = (recorder, hold) => createPolicy({ recorderId: () => recorder, holdActive: () => hold });
const audio = { mediaTypes: ['audio'] };

// Allowed: the recorder, during a hold, audio only.
assert.strictEqual(mk(7, true).request(7, 'media', audio), true);
assert.strictEqual(mk(7, true).check(7, 'media', { mediaType: 'audio' }), true);

// Denied: everything else.
assert.strictEqual(mk(7, true).request(8, 'media', audio), false, 'other window');
assert.strictEqual(mk(7, false).request(7, 'media', audio), false, 'no hold');
assert.strictEqual(mk(7, true).request(7, 'media', { mediaTypes: ['video'] }), false);
assert.strictEqual(mk(7, true).request(7, 'media', { mediaTypes: ['audio', 'video'] }), false);
assert.strictEqual(mk(7, true).request(7, 'media', {}), false);
assert.strictEqual(mk(7, true).request(7, 'media'), false);
assert.strictEqual(mk(7, true).check(7, 'media', { mediaType: 'video' }), false);
assert.strictEqual(mk(7, true).check(7, 'media', { mediaType: 'unknown' }), false);
for (const p of ['geolocation', 'notifications', 'clipboard-read', 'midi', 'fullscreen']) {
  assert.strictEqual(mk(7, true).request(7, p, audio), false, p);
  assert.strictEqual(mk(7, true).check(7, p, { mediaType: 'audio' }), false, p);
}
assert.strictEqual(mk(null, true).request(7, 'media', audio), false, 'no recorder yet');
assert.strictEqual(mk(undefined, true).request(undefined, 'media', audio), false);
