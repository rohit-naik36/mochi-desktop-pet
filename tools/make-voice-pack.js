// Run on the Windows PC (the build sandbox cannot reach huggingface.co):
//   node tools/make-voice-pack.js <outDir> [--tag voice-pack-1] [--repo rohit-naik36/mochi-desktop-pet]
// Downloads the Whisper (speech-to-text) files, writes them flat for a GitHub release
// (slashes become "__"), and writes src/voice/pack-manifest.json with real
// sizes and SHA-256. Upload everything in <outDir>/assets to the release.
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const crypto = require('crypto');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

dns.setDefaultResultOrder('ipv4first'); // a common cause of ECONNRESET on Windows

const args = process.argv.slice(2);
const out = args[0];
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
if (!out) { console.error('usage: node tools/make-voice-pack.js <outDir> [--tag T] [--repo owner/name]'); process.exit(1); }
const tag = opt('--tag', 'voice-pack-1');
const repo = opt('--repo', 'rohit-naik36/mochi-desktop-pet');

const SOURCES = [
  { id: 'Xenova/whisper-base.en', want: (f) => /^(config|generation_config|preprocessor_config|tokenizer|tokenizer_config|special_tokens_map|normalizer|added_tokens|vocab)\.json$|^merges\.txt$|^onnx\/(encoder_model|decoder_model_merged)\.onnx$/.test(f) },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TRIES = 8;

// Retry any network step: connections to huggingface.co sometimes reset.
async function retry(label, fn) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      const why = (e && e.cause && e.cause.code) || (e && e.code) || (e && e.message);
      if (i >= TRIES) throw new Error(`${label} failed after ${TRIES} tries: ${why}`);
      console.log(`  ${label}: ${why}; retry ${i}/${TRIES - 1} in ${2 * i}s`);
      await sleep(2000 * i);
    }
  }
}

const sha256File = (file) => new Promise((resolve, reject) => {
  const h = crypto.createHash('sha256');
  fs.createReadStream(file).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
});

// Resumable: keeps <dest>.part and continues from where it stopped.
async function download(url, dest) {
  if (fs.existsSync(dest)) return;
  const part = dest + '.part';
  await retry(path.basename(dest), async () => {
    const have = fs.existsSync(part) ? fs.statSync(part).size : 0;
    const res = await fetch(url, { headers: have ? { Range: `bytes=${have}-` } : {} });
    if (res.status === 416) { fs.renameSync(part, dest); return; } // already complete
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ws = fs.createWriteStream(part, { flags: res.status === 206 ? 'a' : 'w' });
    await pipeline(Readable.fromWeb(res.body), ws);
    fs.renameSync(part, dest);
  });
}

async function main() {
  const assets = path.join(out, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  const files = [];
  for (const src of SOURCES) {
    const info = await retry('file list for ' + src.id, async () => {
      const r = await fetch(`https://huggingface.co/api/models/${src.id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    const names = (info.siblings || []).map((s) => s.rfilename).filter(src.want);
    console.log(src.id, '->', names.length, 'files');
    if (!names.length) throw new Error('no files matched for ' + src.id);
    for (const rel of names) {
      const name = `models/${src.id}/${rel}`;
      const asset = name.replace(/\//g, '__');
      const dest = path.join(assets, asset);
      await download(`https://huggingface.co/${src.id}/resolve/main/${rel}`, dest);
      const hash = await sha256File(dest);
      const bytes = fs.statSync(dest).size;
      files.push({ name, asset, bytes, sha256: hash });
      console.log('  ', rel, (bytes / 1e6).toFixed(1) + ' MB');
    }
  }
  const manifest = {
    version: '0.13.0-' + tag,
    baseUrl: `https://github.com/${repo}/releases/download/${tag}/`,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
    files,
  };
  const dest = path.join(__dirname, '..', 'src', 'voice', 'pack-manifest.json');
  fs.writeFileSync(dest, JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'pack-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nTotal ${(manifest.totalBytes / 1e6).toFixed(0)} MB. Manifest written to ${dest}.`);
  console.log(`Upload every file in ${assets} to the GitHub release "${tag}", then run npm test.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
