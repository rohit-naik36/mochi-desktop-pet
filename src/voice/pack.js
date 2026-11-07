// The optional voice pack: models downloaded once by the main process,
// resumable, every file checked against a pinned SHA-256 before it is trusted.
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');

const packDir = (userDataPath) => path.join(userDataPath, 'voice-pack');

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
}

const ok = (dir, name) => path.join(dir, name + '.ok');
const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

// 'ready' only when every file was downloaded and verified.
function status(dir, manifest) {
  let ready = 0, any = false;
  for (const f of manifest.files) {
    if (exists(path.join(dir, f.name)) && exists(ok(dir, f.name))) ready++;
    if (exists(path.join(dir, f.name)) || exists(path.join(dir, f.name + '.part'))) any = true;
  }
  if (ready === manifest.files.length) return 'ready';
  return any ? 'partial' : 'missing';
}

function remove(dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* already gone */ } }

const DISK = new Set(['ENOSPC', 'EACCES', 'EPERM', 'EROFS', 'ENOTDIR', 'EEXIST', 'ENOENT', 'EISDIR', 'EMFILE']);

// One file. Resolves 'done' | 'network' | 'disk' | 'aborted'.
function fetchPart({ url, part, start, signal, onBytes, hops = 0 }) {
  return new Promise((resolve) => {
    if (signal && signal.aborted) return resolve('aborted');
    const lib = url.startsWith('https:') ? https : http;
    const headers = start > 0 ? { Range: 'bytes=' + start + '-' } : {};
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
    const req = lib.get(url, { headers }, (res) => {
      // GitHub release assets answer with a redirect to a CDN host. Follow a few.
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (hops >= 5) return finish('network');
        let next;
        try { next = new URL(res.headers.location, url).toString(); } catch { return finish('network'); }
        return fetchPart({ url: next, part, start, signal, onBytes, hops: hops + 1 }).then(finish);
      }
      if (res.statusCode !== 200 && res.statusCode !== 206) { res.resume(); return finish('network'); }
      const resumed = res.statusCode === 206;
      let out;
      try { out = fs.createWriteStream(part, { flags: resumed ? 'a' : 'w' }); } catch { return finish('disk'); }
      let got = resumed ? start : 0;
      out.on('error', (e) => { req.destroy(); finish(DISK.has(e.code) ? 'disk' : 'network'); });
      res.on('data', (d) => { got += d.length; onBytes(got); });
      res.on('aborted', () => out.end(() => finish('network')));
      res.on('error', () => out.end(() => finish('network')));
      res.pipe(out);
      out.on('finish', () => finish(res.complete ? 'done' : 'network'));
    });
    req.on('error', () => finish(signal && signal.aborted ? 'aborted' : 'network'));
    if (signal) signal.addEventListener('abort', () => { req.destroy(); finish('aborted'); }, { once: true });
  });
}

async function download({ dir, manifest, baseUrl, onProgress, signal }) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch { return { ok: false, reason: 'disk' }; }
  let done = 0;
  for (const f of manifest.files) {
    const final = path.join(dir, f.name);
    if (exists(final) && exists(ok(dir, f.name))) { done += f.bytes; continue; }
    try { fs.mkdirSync(path.dirname(final), { recursive: true }); } catch { return { ok: false, reason: 'disk' }; }
    const part = final + '.part';
    let start = 0;
    try { start = fs.statSync(part).size; } catch { /* fresh */ }
    if (start > f.bytes) { fs.rmSync(part, { force: true }); start = 0; }
    if (start < f.bytes) {
      const r = await fetchPart({
        url: baseUrl + (f.asset || f.name), part, start, signal,
        onBytes: (n) => onProgress && onProgress(done + n),
      });
      if (r !== 'done') return { ok: false, reason: r };
    }
    let digest;
    try { digest = await sha256File(part); } catch { return { ok: false, reason: 'disk' }; }
    if (digest !== f.sha256) { fs.rmSync(part, { force: true }); return { ok: false, reason: 'hash' }; }
    try { fs.renameSync(part, final); fs.writeFileSync(ok(dir, f.name), f.sha256); } catch { return { ok: false, reason: 'disk' }; }
    done += f.bytes;
    if (onProgress) onProgress(done);
  }
  return { ok: true };
}

module.exports = { packDir, status, download, remove, sha256File };
