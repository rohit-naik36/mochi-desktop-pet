// node test/voice-safety.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mochi no longer speaks replies: no speaking code may come back by accident.
for (const f of ['text.js', 'voices.js', 'phonemes.js', 'blend.js', 'menu.js']) {
  assert(!fs.existsSync(path.join(__dirname, '../src/voice', f)), 'removed: src/voice/' + f);
}
assert(!fs.existsSync(path.join(__dirname, '../src/voice-player.js')), 'removed: src/voice-player.js');

// Static guards (the "voice off means off" CI check):
const main = fs.readFileSync(path.join(__dirname, '../src/main.js'), 'utf8');
assert(!/require\(['"]\.\/voice\/(host|engine|worker)['"]\)/.test(main), 'main.js never requires host/engine/worker directly');
assert.strictEqual((main.match(/recorder-preload\.js/g) || []).length, 1, 'one place creates the recorder window');
const renderers = ['play.js', 'worry.js', 'pet.js', 'board.js', 'teams.js'].map((f) => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8'));
for (const src of renderers) assert(!/kokoro|transformers|onnxruntime/i.test(src), 'no model code in a window');
// The engine is only referenced by the worker.
for (const f of fs.readdirSync(path.join(__dirname, '../src/voice'))) {
  if (f === 'worker.js' || f === 'engine.js') continue;
  const src = fs.readFileSync(path.join(__dirname, '../src/voice', f), 'utf8');
  assert(!/require\(['"]\.\/engine['"]\)/.test(src), f + ' must not load the engine');
}
// Regression (self-review): Worry() is built before the saved state arrives, so
// the mic button must be revealed from the getState().then(...) block.
const playSrc = fs.readFileSync(path.join(__dirname, '../src/play.js'), 'utf8');
const afterState = playSrc.slice(playSrc.indexOf('window.play.getState().then'));
assert(/voice\.ready\(\)/.test(afterState), 'mic button revealed once state is known');
// Regression: a quick tap must not show a permission error when the hold ended before getUserMedia answered.
const rec = fs.readFileSync(path.join(__dirname, '../src/recorder.js'), 'utf8');
assert(/released/.test(rec) && /if \(!released\)/.test(rec), 'recorder stays quiet when released early');
console.log('voice-safety ok');
