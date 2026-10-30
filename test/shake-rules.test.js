const test = require('node:test');
const assert = require('node:assert');
const R = require('../src/shake-rules.js');
const W = require('../src/worry.js');

test('anger words are found in English, Hinglish and Hindi', () => {
  for (const t of ['my boss makes me so angry', "I'm furious about the deadline", 'so fed up with this team', 'He is really annoying me',
    'bahut gussa aa raha hai', 'mujhe chidh hoti hai', 'मुझे बहुत गुस्सा आ रहा है']) assert.ok(R.isAngry(t), t);
});

test('plain words do not trigger by accident', () => {
  for (const t of ['I made a mistake', 'the nomad project', 'the deadline on Friday', 'I am worried about my exam', 'dramatic changes']) assert.ok(!R.isAngry(t), t);
});

test('offered only after an ordinary reply to an angry worry', () => {
  const ordinary = {};
  assert.ok(R.shouldOffer(ordinary, 'so angry at my manager'));
  assert.ok(!R.shouldOffer(ordinary, 'the deadline is Friday'));
  assert.ok(!R.shouldOffer({ gentle: true }, 'so angry and so sad'));
  assert.ok(!R.shouldOffer({ serious: true }, 'angry'));
  assert.ok(!R.shouldOffer({ celebrate: true }, 'angry'));
  assert.ok(!R.shouldOffer(null, 'angry'));
});

test('real worry replies: angry gets the offer, sad and hopeless do not', () => {
  const offer = (text) => R.shouldOffer(W.respond(text, 'Rohit', 'en'), text);
  assert.ok(offer('I am so angry at my manager for changing the deadline again'));
  assert.ok(!offer('I feel so sad and angry and lonely'));
  assert.ok(!offer("I am furious and what's the point of any of this"));
  assert.ok(!offer('I got promoted but I am angry about the raise'));
});

test('round ends on done, target or time, not before', () => {
  assert.equal(R.roundEnd({ hits: 3, elapsedMs: 5000 }), null);
  assert.equal(R.roundEnd({ hits: R.HITS_TARGET }), 'target');
  assert.equal(R.roundEnd({ hits: 2, elapsedMs: R.MAX_MS }), 'time');
  assert.equal(R.roundEnd({ hits: 0, elapsedMs: 100, doneClicked: true }), 'done');
});

test('cheers: every fourth hit and the last few, in three stages', () => {
  assert.ok(!R.cheerNow(0) && !R.cheerNow(1) && R.cheerNow(4) && R.cheerNow(8));
  assert.ok(R.cheerNow(R.HITS_TARGET - 1) && R.cheerNow(R.HITS_TARGET));
  assert.deepEqual([R.stage(1), R.stage(9), R.stage(17)], ['a', 'b', 'c']);
});
