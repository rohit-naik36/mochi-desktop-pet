const test = require('node:test');
const assert = require('node:assert/strict');
const Rules = require('../src/pet-rules');

test('Mochi stays still while waiting for an answer, or while you aim at it', () => {
  const now = 1_000_000;
  assert.equal(Rules.shouldStayStill({ now }), false, 'free to wander');
  assert.equal(Rules.shouldStayStill({ bubbleSticky: true, now }), true, 'a reminder or question is waiting');
  assert.equal(Rules.shouldStayStill({ pointerOver: true, now }), true, 'the pointer is on Mochi or its bubble');
  assert.equal(Rules.shouldStayStill({ upset: true, now }), true);
  assert.equal(Rules.shouldStayStill({ calmUntil: now + 1, now }), true, 'just after an answer');
  assert.equal(Rules.shouldStayStill({ calmUntil: now, now }), false, 'the calm period is over');
});

test('the stay-put time after an answer is a few seconds, not minutes', () => {
  assert.ok(Rules.STILL_AFTER_MS >= 2000 && Rules.STILL_AFTER_MS <= 10000);
});

test('the question bubble has the options, then Skip, and reports the choice', () => {
  const picked = [];
  const acts = Rules.questionActions({ options: ['Very', 'Mostly', 'Not really', 'Not at all'] }, 'Skip', (a) => picked.push(a));
  assert.deepEqual(acts.map((a) => a.label), ['Very', 'Mostly', 'Not really', 'Not at all', 'Skip']);
  acts[2].run();
  acts[4].run();
  assert.deepEqual(picked, [2, -1]);
});

test('a question with too few or too many options gets no buttons', () => {
  assert.deepEqual(Rules.questionActions({ options: ['Only one'] }, 'Skip', () => {}), []);
  assert.deepEqual(Rules.questionActions({ options: ['a', 'b', 'c', 'd', 'e', 'f'] }, 'Skip', () => {}), []);
  assert.deepEqual(Rules.questionActions({}, 'Skip', () => {}), []);
  assert.deepEqual(Rules.questionActions(null, 'Skip', () => {}), []);
});

test('the question line says who asks, then the question', () => {
  assert.equal(Rules.questionLine('Acme asks, anonymously:', 'How was your week?'), 'Acme asks, anonymously: How was your week?');
});

test('every language has the words the question bubble needs', () => {
  const { STRINGS } = require('../src/i18n');
  for (const lang of Object.keys(STRINGS)) {
    const c = STRINGS[lang].company;
    for (const k of ['asking', 'skip', 'thanks', 'skipped']) assert.ok(c[k], `${lang} is missing company.${k}`);
  }
});
