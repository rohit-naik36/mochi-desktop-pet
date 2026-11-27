const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { isFestiveDate, shouldBeFestive } = require('../docs/assets/js/festive.js');

const d = (y, m, day) => new Date(y, m - 1, day, 12);

test('festive window is 20 Dec to 2 Jan inclusive', () => {
  assert.strictEqual(isFestiveDate(d(2026, 12, 19)), false);
  assert.strictEqual(isFestiveDate(d(2026, 12, 20)), true);
  assert.strictEqual(isFestiveDate(d(2026, 12, 31)), true);
  assert.strictEqual(isFestiveDate(d(2027, 1, 1)), true);
  assert.strictEqual(isFestiveDate(d(2027, 1, 2)), true);
  assert.strictEqual(isFestiveDate(d(2027, 1, 3)), false);
  assert.strictEqual(isFestiveDate(d(2026, 6, 15)), false);
});

test('?festive=1 previews, ?festive=0 forces off, otherwise date decides', () => {
  assert.strictEqual(shouldBeFestive(d(2026, 6, 15), '?festive=1'), true);
  assert.strictEqual(shouldBeFestive(d(2026, 12, 25), '?festive=0'), false);
  assert.strictEqual(shouldBeFestive(d(2026, 6, 15), ''), false);
  assert.strictEqual(shouldBeFestive(d(2026, 6, 15), '?festive=yes'), false);
  assert.strictEqual(shouldBeFestive(d(2026, 12, 25), '?x=1'), true);
});

test('pages load festive.js, it makes no requests, and motion respects reduced-motion', () => {
  const root = path.join(__dirname, '..');
  assert.match(fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8'), /assets\/js\/festive\.js/);
  const js = fs.readFileSync(path.join(root, 'docs/assets/js/festive.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|https?:\/\/(?!www\.w3\.org)|localStorage|cookie/);
  const css = fs.readFileSync(path.join(root, 'docs/assets/css/site.css'), 'utf8');
  assert.match(css, /prefers-reduced-motion: no-preference\) \{\s*\.festive-banner/);
});
