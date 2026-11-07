// Main-process entry for voice. main.js requires this only when the user has
// turned voice on, and the heavy parts (host, then the worker process) load
// only on first use. Engines never load in this process.
const path = require('path');
const Text = require('./text');
const Voices = require('./voices');

function electronSpawn(packDir) {
  const { utilityProcess } = require('electron');
  const child = utilityProcess.fork(path.join(__dirname, 'worker.js'), [packDir], { stdio: 'ignore' });
  return { postMessage: (m) => child.postMessage(m), on: (evt, fn) => child.on(evt, fn), kill: () => child.kill() };
}

function createVoice({ getState, packDir, spawn, sendToPlay }) {
  let host = null;
  const getHost = () => host || (host = require('./host').createHost({ spawn: spawn ? () => spawn(packDir) : () => electronSpawn(packDir) }));

  const settings = () => (getState().voice || {});
  // The saved voice, if it still belongs to the buddy's gender; else the first for that gender.
  const chosen = () => {
    const gender = getState().petGender || 'nonbinary';
    const saved = Voices.byId(settings().voice);
    return saved && saved.gender === gender ? saved : Voices.byId(Voices.defaultVoice(gender));
  };

  function stop() {
    if (host) host.stop();
    sendToPlay('voice-stopped');
  }

  async function speak(lines) {
    stop();
    const v = settings();
    const voice = chosen();
    if (!v.on || !voice || !Array.isArray(lines)) return;
    const sentences = lines.flatMap(Text.splitSentences).map((s) => Text.respell(s));
    if (!sentences.length) return;
    try {
      await getHost().speak({
        sentences, voice: voice.kokoro, speed: Voices.speedFor(voice.id, v.pace),
        onAudio: (chunk) => sendToPlay('voice-audio', chunk),
      });
    } catch {
      sendToPlay('voice-error', 'failed');
    }
  }

  return {
    speak, stop,
    getHost,
    available: () => !!settings().on,
    shutdown: () => { if (host) { host.shutdown(); host = null; } },
  };
}

module.exports = { createVoice };
