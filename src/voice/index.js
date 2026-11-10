// Main-process entry for voice input (push-to-talk). main.js requires this only
// when the user has turned voice input on, and the heavy parts (host, then the
// worker process) load only on first use. The engine never loads in this process.
const path = require('path');

function electronSpawn(packDir) {
  const { utilityProcess } = require('electron');
  const child = utilityProcess.fork(path.join(__dirname, 'worker.js'), [packDir], { stdio: 'ignore' });
  return { postMessage: (m) => child.postMessage(m), on: (evt, fn) => child.on(evt, fn), kill: () => child.kill() };
}

function createVoice({ packDir, spawn }) {
  let host = null;
  const getHost = () => host || (host = require('./host').createHost({ spawn: spawn ? () => spawn(packDir) : () => electronSpawn(packDir) }));
  return {
    getHost,
    shutdown: () => { if (host) { host.shutdown(); host = null; } },
  };
}

module.exports = { createVoice };
