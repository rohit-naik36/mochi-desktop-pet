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
assert.deepStrictEqual(V.replyLines({ lang: 'en' }), [])// speakable: persona lines made fit to say. Placeholders filled, emoji and *stage directions* dropped.
{
  const v = { greet: 'Good evening', name: 'Rohit', pet: 'Mochi' };
  const S = V.speakable;
  assert.strictEqual(S('{greet}{n}... um, hi. I saved you a spot 👉👈', v), 'Good evening, Rohit… um, hi. I saved you a spot.');
  assert.strictEqual(S('*peeks out* Oh! {greet}{n}. I missed you a little. Okay, a lot.', v), 'Oh! Good evening, Rohit. I missed you a little. Okay, a lot.');
  assert.strictEqual(S("{greet}{n}! LET'S GOOO! 🔥 Today's ours!", v), "Good evening, Rohit! LET'S Go! Today's ours!");
  assert.strictEqual(S('*yawns* {greet}{n}... I come alive at night ✨', v), 'Good evening, Rohit… I come alive at night.');
  assert.strictEqual(S('{greet}{n}! Missed you.', { greet: 'Good evening' }), 'Good evening! Missed you.', 'no name, no comma');
  assert.strictEqual(S("Hi{n}! I'm {pet}. Nice to meet you! 💛", v), "Hi, Rohit! I'm Mochi. Nice to meet you!");
  assert.strictEqual(S('Hello {unknown} there', v), 'Hello there.');
  assert.strictEqual(S('{greet}{n}... उम्म, हाय।', v), '', 'Hindi is never spoken');
  // an emoji between two sentences leaves a pause, not a run-on
  assert.strictEqual(S('{greet}{n} 💛 I was hoping you would come back.', v), 'Good evening, Rohit. I was hoping you would come back.');
  assert.strictEqual(S('{greet}{n} 💗 Today has good things hiding in it.', v), 'Good evening, Rohit. Today has good things hiding in it.');
  assert.strictEqual(S('Hello! 🔥 Go now', v), 'Hello! Go now.', 'no stray full stop after !');
  // a shy stutter is dropped, it would be read as a spelled letter
  assert.strictEqual(S("H-hi{n}... I'm {pet}.", v), "Hi, Rohit… I'm Mochi.");
  assert.strictEqual(S('Send an e-mail', v), 'Send an e-mail.');
  assert.strictEqual(S('', v), '');
  assert.strictEqual(S(null, v), '');
  assert.strictEqual(S('👉👈', v), '', 'only emoji leaves nothing to say');
}

;
