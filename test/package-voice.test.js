// node test/package-voice.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const b = pkg.build;
assert(b.files.includes('!node_modules/sharp/**'), 'sharp (LGPL) stays out of the packaged app');
assert(b.asarUnpack.includes('node_modules/onnxruntime-node/bin/**'), 'onnxruntime native files unpacked');
assert(b.appx.capabilities.includes('microphone') && b.appx.capabilities.includes('runFullTrust'));
assert(pkg.dependencies['kokoro-js'] && pkg.dependencies['@huggingface/transformers']);
// The voice pack is never bundled in the installer.
assert(!JSON.stringify(b.extraResources).includes('voice'), 'no voice pack in extraResources');
assert(!b.files.some((f) => /voice-pack/.test(f)) || b.files.every((f) => !/^src\/voice-pack/.test(f)));
// Mac builds get no microphone entitlement in 0.13.0 (voice is Windows-only).
for (const f of fs.readdirSync(path.join(__dirname, '../build')).filter((x) => x.endsWith('.plist'))) {
  assert(!/audio-input/.test(fs.readFileSync(path.join(__dirname, '../build', f), 'utf8')), f);
}
// Manifest: complete once the pack is built (skipped while placeholders remain).
const m = require('../src/voice/pack-manifest.json');
if (!m.files.some((f) => /^TBD/.test(f.sha256))) {
  assert(m.files.every((f) => /^[0-9a-f]{64}$/.test(f.sha256) && f.bytes > 0));
  assert.strictEqual(m.totalBytes, m.files.reduce((n, f) => n + f.bytes, 0));
  for (const v of ['af_heart', 'af_bella', 'am_puck', 'am_echo', 'bm_fable', 'af_alloy']) {
    assert(m.files.some((f) => f.name.endsWith('voices/' + v + '.bin')), 'voice file for ' + v);
  }
}
console.log('package-voice ok');
