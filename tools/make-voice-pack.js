// Run on the Windows PC (the build sandbox cannot reach huggingface.co):
//   node tools/make-voice-pack.js <outDir> [--tag voice-pack-1] [--repo rohit-naik36/mochi-desktop-pet]
// Downloads the Kokoro and Whisper files, writes them flat for a GitHub release
// (slashes become "__"), and writes src/voice/pack-manifest.json with real
// sizes and SHA-256. Upload everything in <outDir>/assets to the release.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const args = process.argv.slice(2);
const out = args[0];
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
if (!out) { console.error('usage: node tools/make-voice-pack.js <outDir> [--tag T] [--repo owner/name]'); process.exit(1); }
const tag = opt('--tag', 'voice-pack-1');
const repo = opt('--repo', 'rohit-naik36/mochi-desktop-pet');

const VOICE_FILES = ['af_heart', 'af_bella', 'am_puck', 'am_echo', 'bm_fable', 'af_alloy', 'bf_isabella', 'am_fenrir'].map((v) => `voices/${v}.bin`);
const SOURCES = [
  { id: 'onnx-community/Kokoro-82M-v1.0-ONNX', want: (f) => /^(config\.json|tokenizer\.json|tokenizer_config\.json|onnx\/model\.onnx)$/.test(f) || VOICE_FILES.includes(f) },
  { id: 'Xenova/whisper-base.en', want: (f) => /^(config|generation_config|preprocessor_config|tokenizer|tokenizer_config|special_tokens_map|normalizer|added_tokens|vocab)\.json$|^merges\.txt$|^onnx\/(encoder_model|decoder_model_merged)\.onnx$/.test(f) },
];

async function main() {
  const assets = path.join(out, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  const files = [];
  for (const src of SOURCES) {
    const info = await (await fetch(`https://huggingface.co/api/models/${src.id}`)).json();
    const names = (info.siblings || []).map((s) => s.rfilename).filter(src.want);
    console.log(src.id, '->', names.length, 'files');
    if (!names.length) throw new Error('no files matched for ' + src.id);
    for (const rel of names) {
      const name = `models/${src.id}/${rel}`;
      const asset = name.replace(/\//g, '__');
      const dest = path.join(assets, asset);
      const res = await fetch(`https://huggingface.co/${src.id}/resolve/main/${rel}`);
      if (!res.ok) throw new Error(`${res.status} for ${src.id}/${rel}`);
      const hash = crypto.createHash('sha256');
      const ws = fs.createWriteStream(dest);
      const body = Readable.fromWeb(res.body);
      body.on('data', (d) => hash.update(d));
      await pipeline(body, ws);
      const bytes = fs.statSync(dest).size;
      files.push({ name, asset, bytes, sha256: hash.digest('hex') });
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
