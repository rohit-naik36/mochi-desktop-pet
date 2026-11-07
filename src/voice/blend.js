// Voice blending. A Kokoro voice file is a table of 256-number "style" rows, one row per
// possible sentence length (raw little-endian float32). Averaging two voices' tables, row
// by row, gives a new voice that sounds like a mix of the two. Pure maths, no models.
const STYLE_DIM = 256;
const MAX_ROW = 509; // the model reads at most 510 tokens, less two pad tokens

// Raw file bytes -> Float32Array. Copies, so an unaligned Buffer view is fine.
function readVoice(buf) {
  if (buf.length % 4) throw new Error('voice file length must be a multiple of 4 bytes');
  const copy = new ArrayBuffer(buf.length);
  new Uint8Array(copy).set(buf);
  return new Float32Array(copy);
}

// parts: [{ data: Float32Array, weight: number > 0 }]. Weights are normalised to sum to 1.
function blend(parts) {
  if (!Array.isArray(parts) || !parts.length) throw new Error('blend needs at least one voice');
  const len = parts[0].data.length;
  let total = 0;
  for (const p of parts) {
    if (p.data.length !== len) throw new Error('all voices must be the same length');
    if (!(p.weight > 0)) throw new Error('every weight must be greater than 0');
    total += p.weight;
  }
  const out = new Float32Array(len);
  for (const p of parts) {
    const w = p.weight / total;
    for (let i = 0; i < len; i++) out[i] += p.data[i] * w;
  }
  return out;
}

// The 256 numbers the model wants for a sentence of `inputLength` tokens (pad tokens included).
function styleRow(data, inputLength) {
  const row = Math.min(Math.max(inputLength - 2, 0), MAX_ROW);
  return data.slice(row * STYLE_DIM, (row + 1) * STYLE_DIM);
}

module.exports = { blend, styleRow, readVoice, STYLE_DIM };
