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
console.log('voice-player ok');
