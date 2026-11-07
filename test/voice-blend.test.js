// node test/voice-blend.test.js
// Blending two Kokoro voices into a new one, and picking the style row for a sentence.
const assert = require('assert');
const { blend, styleRow, readVoice, STYLE_DIM } = require('../src/voice/blend');

assert.strictEqual(STYLE_DIM, 256);
const A = Float32Array.from([1, 2, 3, 4]);
const B = Float32Array.from([3, 2, 1, 0]);

// Weighted average, weights are normalised, inputs untouched.
assert.deepStrictEqual([...blend([{ data: A, weight: 1 }, { data: B, weight: 1 }])], [2, 2, 2, 2]);
assert.deepStrictEqual([...blend([{ data: A, weight: 3 }, { data: B, weight: 1 }])], [1.5, 2, 2.5, 3]);
assert.deepStrictEqual([...blend([{ data: A, weight: 0.5 }])], [1, 2, 3, 4], 'one voice stays itself');
assert.deepStrictEqual([...A], [1, 2, 3, 4]);
assert(blend([{ data: A, weight: 1 }]) instanceof Float32Array);
assert.throws(() => blend([]), /at least one/);
assert.throws(() => blend([{ data: A, weight: 1 }, { data: Float32Array.from([1]), weight: 1 }]), /same length/);
assert.throws(() => blend([{ data: A, weight: 0 }]), /weight/);
assert.throws(() => blend([{ data: A, weight: -1 }, { data: B, weight: 2 }]), /weight/);

// readVoice: raw little-endian float32, even when the Buffer is not 4-byte aligned.
{
  const f = Float32Array.from([0.5, -1.25, 3]);
  const raw = Buffer.concat([Buffer.from([9]), Buffer.from(f.buffer)]).subarray(1); // misaligned view
  assert.deepStrictEqual([...readVoice(raw)], [0.5, -1.25, 3]);
  assert.throws(() => readVoice(Buffer.alloc(7)), /multiple of 4/);
}

// styleRow: row index is the token count without the two pad tokens, capped at 509.
{
  const rows = 511;
  const data = new Float32Array(rows * STYLE_DIM);
  for (let r = 0; r < rows; r++) data.fill(r, r * STYLE_DIM, (r + 1) * STYLE_DIM);
  assert.strictEqual(styleRow(data, 12)[0], 10);
  assert.strictEqual(styleRow(data, 12).length, STYLE_DIM);
  assert.strictEqual(styleRow(data, 2)[0], 0);
  assert.strictEqual(styleRow(data, 0)[0], 0);
  assert.strictEqual(styleRow(data, 9999)[0], 509);
}

console.log('voice-blend ok');
