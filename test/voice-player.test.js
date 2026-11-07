// node test/voice-player.test.js
const assert = require('assert');
const { createPlayer } = require('../src/voice-player');

function ctx() {
  const c = { currentTime: 0, destination: {}, nodes: [] };
  c.createBuffer = (_ch, len, rate) => ({ duration: len / rate, copyToChannel() {} });
  c.createBufferSource = () => {
    const n = { connect() {}, start(t) { n.at = t; c.nodes.push(n); }, stop() { n.stopped = true; } };
    return n;
  };
  return c;
}
const chunk = () => ({ pcm: new Float32Array(24000), rate: 24000 });

const c = ctx();
const p = createPlayer(() => c);
assert.strictEqual(p.isPlaying(), false);
p.enqueue(chunk()); p.enqueue(chunk()); p.enqueue(chunk());
assert.strictEqual(c.nodes.length, 3);
assert(c.nodes[1].at >= c.nodes[0].at + 1 - 1e-9 && c.nodes[2].at >= c.nodes[1].at + 1 - 1e-9, 'back to back');
assert.strictEqual(p.isPlaying(), true);
p.stop();
assert(c.nodes.every((n) => n.stopped)); assert.strictEqual(p.isPlaying(), false);
p.enqueue(chunk());
assert(c.nodes[3].at < 1, 'queue restarts after stop');
// A context the browser left suspended would stay silent forever: it must be resumed.
{
  const sc = ctx(); sc.state = 'suspended'; sc.resumed = 0; sc.resume = () => { sc.resumed++; sc.state = 'running'; return Promise.resolve(); };
  const sp = createPlayer(() => sc);
  sp.enqueue(chunk());
  assert.strictEqual(sc.resumed, 1, 'suspended context resumed');
  sp.enqueue(chunk());
  assert.strictEqual(sc.resumed, 1, 'running context left alone');
  // and a context whose resume() rejects must not break playback
  const bad = ctx(); bad.state = 'suspended'; bad.resume = () => Promise.reject(new Error('no'));
  createPlayer(() => bad).enqueue(chunk());
}
console.log('voice-player ok');
