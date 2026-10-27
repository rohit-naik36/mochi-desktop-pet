// node tools/fetch-model.mjs [model-id]
// Downloads the model that ships inside Mochi (src/ai-models.json, "bundled")
// to models/<id>.gguf, checked against the SHA-256 Hugging Face publishes.
// The build workflows run this before electron-builder, which copies
// models/ into the app's resources.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const cfg = JSON.parse(fs.readFileSync(new URL('../src/ai-models.json', import.meta.url), 'utf8'));
const id = process.argv[2] || cfg.bundled;
const m = cfg.models[id];
if (!m) throw new Error('unknown model ' + id);
const dir = fileURLToPath(new URL('../models/', import.meta.url));
const out = path.join(dir, id + '.gguf');
fs.mkdirSync(dir, { recursive: true });
for (const f of fs.readdirSync(dir)) if (f !== id + '.gguf') fs.rmSync(path.join(dir, f)); // ship one model only

const tree = await (await fetch(`https://huggingface.co/api/models/${m.repo}/tree/main`)).json();
const file = tree.find((x) => x.type === 'file' && new RegExp(m.match, 'i').test(x.path));
if (!file || !file.lfs) throw new Error('model file not found in ' + m.repo);

const sha = (p) => new Promise((resolve) => {
  const h = crypto.createHash('sha256');
  fs.createReadStream(p).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex')));
});
if (fs.existsSync(out) && (await sha(out)) === file.lfs.oid) {
  console.log(`${id}: already here (${file.path})`);
} else {
  const res = await fetch(`https://huggingface.co/${m.repo}/resolve/main/${encodeURIComponent(file.path)}`);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(out + '.part'));
  if ((await sha(out + '.part')) !== file.lfs.oid) { fs.rmSync(out + '.part'); throw new Error('download check failed'); }
  fs.renameSync(out + '.part', out);
  console.log(`${id}: downloaded ${file.path}, ${Math.round(file.lfs.size / 1e6)} MB`);
}
