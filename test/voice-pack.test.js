// node test/voice-pack.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const Pack = require('../src/voice/pack');

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const A = Buffer.alloc(300000, 'a');
const B = Buffer.alloc(120000, 'b');
const C = Buffer.alloc(5000, 'c');
const FILES = { 'a.bin': A, 'b.bin': B, 'sub__c.bin': C };
const manifest = (over = {}) => ({
  version: 't1',
  totalBytes: A.length + B.length,
  files: [
    { name: 'a.bin', bytes: A.length, sha256: sha(A) },
    { name: 'b.bin', bytes: B.length, sha256: over.badB ? sha(Buffer.from('x')) : sha(B) },
  ],
});
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mochi-pack-'));

function serve({ cutAt = 0 } = {}) {
  const seen = [];
  let cutDone = !cutAt;
  const srv = http.createServer((req, res) => {
    // GitHub release assets answer with a 302 to another host; /r/<file> mimics that.
    if (req.url.startsWith('/r/')) { res.statusCode = 302; res.setHeader('Location', '/' + req.url.slice(3)); return res.end(); }
    if (req.url === '/loop') { res.statusCode = 302; res.setHeader('Location', '/loop'); return res.end(); }
    const buf = FILES[req.url.slice(1)];
    if (!buf) { res.statusCode = 404; return res.end(); }
    const m = /bytes=(\d+)-/.exec(req.headers.range || '');
    const start = m ? Number(m[1]) : 0;
    seen.push(req.headers.range || '');
    res.statusCode = m ? 206 : 200;
    res.setHeader('Content-Length', buf.length - start);
    if (!cutDone && req.url === '/a.bin') {
      cutDone = true;
      res.write(buf.subarray(start, start + cutAt));
      setTimeout(() => res.destroy(), 20);
      return;
    }
    res.end(buf.subarray(start));
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, seen, url: 'http://127.0.0.1:' + srv.address().port + '/' })));
}

(async () => {
  // happy path
  { const s = await serve(); const dir = tmp(); const m = manifest(); const prog = [];
    assert.strictEqual(Pack.status(dir, m), 'missing');
    const r = await Pack.download({ dir, manifest: m, baseUrl: s.url, onProgress: (b) => prog.push(b) });
    assert.deepStrictEqual(r, { ok: true });
    assert.strictEqual(Pack.status(dir, m), 'ready');
    assert(prog.length > 0 && prog[prog.length - 1] === m.totalBytes && prog.every((v, i) => !i || v >= prog[i - 1]));
    // Remove empties it.
    Pack.remove(dir); assert.strictEqual(Pack.status(dir, m), 'missing');
    s.srv.close(); }

  // redirected downloads (GitHub release assets) are followed, including with Range on resume
  { const s = await serve(); const dir = tmp(); const m = manifest();
    const r = await Pack.download({ dir, manifest: m, baseUrl: s.url + 'r/' });
    assert.deepStrictEqual(r, { ok: true });
    assert.strictEqual(Pack.status(dir, m), 'ready');
    s.srv.close(); }

  // a redirect loop gives up as a network failure
  { const s = await serve(); const dir = tmp(); const m = manifest();
    const r = await Pack.download({ dir, manifest: { ...m, files: [{ name: 'loop', bytes: 10, sha256: sha(A) }] }, baseUrl: s.url });
    assert.deepStrictEqual(r, { ok: false, reason: 'network' });
    s.srv.close(); }

  // wrong hash: file deleted
  { const s = await serve(); const dir = tmp(); const m = manifest({ badB: true });
    const r = await Pack.download({ dir, manifest: m, baseUrl: s.url });
    assert.deepStrictEqual(r, { ok: false, reason: 'hash' });
    assert(!fs.existsSync(path.join(dir, 'b.bin')) && !fs.existsSync(path.join(dir, 'b.bin.part')));
    assert.notStrictEqual(Pack.status(dir, m), 'ready');
    s.srv.close(); }

  // interrupted, then resumed with a Range header
  { const s = await serve({ cutAt: 50000 }); const dir = tmp(); const m = manifest();
    const r1 = await Pack.download({ dir, manifest: m, baseUrl: s.url });
    assert.deepStrictEqual(r1, { ok: false, reason: 'network' });
    assert(fs.existsSync(path.join(dir, 'a.bin.part')));
    assert.strictEqual(Pack.status(dir, m), 'partial');
    const got = fs.statSync(path.join(dir, 'a.bin.part')).size;
    assert(got > 0 && got < A.length);
    const r2 = await Pack.download({ dir, manifest: m, baseUrl: s.url });
    assert.deepStrictEqual(r2, { ok: true });
    assert(s.seen.includes('bytes=' + got + '-'), 'resume used Range: ' + s.seen);
    assert.strictEqual(Pack.status(dir, m), 'ready');
    s.srv.close(); }

  // disk problem: dir sits under a regular file
  { const s = await serve(); const base = tmp(); const f = path.join(base, 'file'); fs.writeFileSync(f, 'x');
    const r = await Pack.download({ dir: path.join(f, 'pack'), manifest: manifest(), baseUrl: s.url });
    assert.deepStrictEqual(r, { ok: false, reason: 'disk' });
    s.srv.close(); }

  // server down
  { const dir = tmp();
    const r = await Pack.download({ dir, manifest: manifest(), baseUrl: 'http://127.0.0.1:1/' });
    assert.deepStrictEqual(r, { ok: false, reason: 'network' }); }

  // abort leaves .part
  { const s = await serve({ cutAt: 0 }); const dir = tmp(); const ac = new AbortController();
    const p = Pack.download({ dir, manifest: manifest(), baseUrl: s.url, signal: ac.signal, onProgress: () => ac.abort() });
    const r = await p;
    assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, 'aborted');
    assert.notStrictEqual(Pack.status(dir, manifest()), 'ready');
    s.srv.close(); }

  // nested pack paths come from flat release asset names
  { const s = await serve(); const dir = tmp();
    const m = { version: 't', totalBytes: C.length, files: [{ name: 'sub/c.bin', asset: 'sub__c.bin', bytes: C.length, sha256: sha(C) }] };
    assert.deepStrictEqual(await Pack.download({ dir, manifest: m, baseUrl: s.url }), { ok: true });
    assert(fs.existsSync(path.join(dir, 'sub', 'c.bin'))); assert.strictEqual(Pack.status(dir, m), 'ready');
    s.srv.close(); }

  assert.strictEqual(Pack.packDir('/u'), path.join('/u', 'voice-pack'));
  console.log('voice-pack ok');
})().catch((e) => { console.error(e); process.exit(1); });
