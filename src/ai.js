// Offline AI (experiment): downloads one small open model on request, then
// runs it on this laptop with node-llama-cpp. Nothing is sent anywhere; the
// only network use is the one-time model download from Hugging Face.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { net } = require('electron');
const Prompt = require('./ai-prompt');

// Qwen3.5 small models: Apache 2.0, free for commercial use.
const MODELS = {
  'qwen3.5-2b': { name: 'Qwen3.5 2B', repo: 'unsloth/Qwen3.5-2B-GGUF', match: /Q4_K_M\.gguf$/i, approxMB: 1300 },
  'qwen3.5-0.8b': { name: 'Qwen3.5 0.8B', repo: 'unsloth/Qwen3.5-0.8B-GGUF', match: /Q4_K_M\.gguf$/i, approxMB: 550 },
};
const DEFAULT = 'qwen3.5-2b';
const REPLY_MS = 9000; // slower than this and Mochi uses its written reply

let dir = null;
let status = { state: 'off', model: DEFAULT, progress: 0, error: null, loaded: false };
let onStatus = () => {};
let llama = null, model = null, context = null, session = null, grammar = null, busy = Promise.resolve();

function setStatus(patch) { status = { ...status, ...patch }; onStatus(status); }
function fileFor(id) { return path.join(dir, id + '.gguf'); }

function init(userData, saved, cb) {
  dir = path.join(userData, 'models');
  onStatus = cb || onStatus;
  const id = process.env.MOCHI_AI_MODEL in MODELS ? process.env.MOCHI_AI_MODEL : DEFAULT;
  status = { state: 'off', model: id, progress: 0, error: null, loaded: false };
  if (saved && saved.on && fs.existsSync(fileFor(id))) { setStatus({ state: 'ready' }); warm(); }
  else if (fs.existsSync(fileFor(id))) setStatus({ state: 'downloaded' });
}

async function getJSON(url) {
  const res = await net.fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// Picks the Q4_K_M file from the repo and checks it against the SHA-256 the
// repo publishes, so a broken or swapped download is never loaded.
async function download(id = status.model) {
  const m = MODELS[id];
  if (!m || status.state === 'downloading') return;
  fs.mkdirSync(dir, { recursive: true });
  setStatus({ state: 'downloading', model: id, progress: 0, error: null });
  const tmp = fileFor(id) + '.part';
  try {
    const tree = await getJSON(`https://huggingface.co/api/models/${m.repo}/tree/main`);
    const f = tree.find((x) => x.type === 'file' && m.match.test(x.path));
    if (!f || !f.lfs) throw new Error('model file not found');
    const res = await net.fetch(`https://huggingface.co/${m.repo}/resolve/main/${encodeURIComponent(f.path)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const total = Number(res.headers.get('content-length')) || f.lfs.size;
    const hash = crypto.createHash('sha256');
    const out = fs.createWriteStream(tmp);
    let got = 0, last = 0;
    for await (const chunk of res.body) {
      hash.update(chunk);
      got += chunk.length;
      if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
      const pct = Math.floor((got / total) * 100);
      if (pct !== last) { last = pct; setStatus({ progress: pct }); }
    }
    await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
    if (hash.digest('hex') !== f.lfs.oid) throw new Error('download check failed');
    fs.renameSync(tmp, fileFor(id));
    setStatus({ state: 'ready', progress: 100 });
    warm();
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    setStatus({ state: 'error', error: String(e.message || e) });
  }
}

async function load() {
  if (session) return session;
  const L = await import('node-llama-cpp');
  llama = llama || await L.getLlama({ gpu: 'auto' });
  model = await llama.loadModel({ modelPath: fileFor(status.model) });
  context = await model.createContext({ contextSize: 2048 });
  grammar = await llama.createGrammarForJsonSchema(Prompt.SCHEMA);
  session = { L, sequence: context.getSequence() };
  return session;
}

async function unload() {
  const c = context, m = model;
  session = null; context = null; model = null;
  if (c) await c.dispose().catch(() => {});
  if (m) await m.dispose().catch(() => {});
}

// One reply at a time; a fresh chat each time so nothing is remembered.
// Loads the model in the background once it's on, so the first worry
// doesn't wait for it. Until it's loaded, Mochi uses the written reply.
let warming = null;
function warm() {
  if (session || warming || status.state !== 'ready') return;
  setStatus({ loaded: false });
  warming = load()
    .then(() => setStatus({ loaded: true, error: null }))
    .catch((e) => { unload(); setStatus({ state: 'error', error: 'could not start: ' + String(e.message || e).slice(0, 120) }); })
    .finally(() => { warming = null; });
}

function reply(req) {
  if (!session) { warm(); return Promise.resolve(null); }
  const job = busy.then(() => run(req)).catch(() => null);
  busy = job.then(() => {}, () => {});
  return Promise.race([job, new Promise((r) => setTimeout(() => r(null), REPLY_MS))]);
}

async function run({ text, lang, name, pet, skin }) {
  if (status.state !== 'ready') return null;
  const { L, sequence } = await load();
  const { system, user } = Prompt.messages({ text, lang, name, pet, skin });
  const chat = new L.LlamaChatSession({ contextSequence: sequence, systemPrompt: system, autoDisposeSequence: false, chatWrapper: new L.QwenChatWrapper({ variation: '3.5', thoughts: 'discourage' }) });
  try {
    const raw = await chat.prompt(user, { grammar, maxTokens: 160, temperature: 0.7, budgets: { thoughtTokens: 0 } });
    return Prompt.check(Prompt.parse(raw), lang);
  } finally {
    chat.dispose({ disposeSequence: false });
    await sequence.clearHistory();
  }
}

async function turnOff() { await unload(); setStatus({ state: fs.existsSync(fileFor(status.model)) ? 'downloaded' : 'off', loaded: false }); }
async function turnOn() { if (fs.existsSync(fileFor(status.model))) { setStatus({ state: 'ready', error: null }); warm(); } else download(); }
async function remove() { await unload(); fs.rmSync(dir, { recursive: true, force: true }); setStatus({ state: 'off', progress: 0, loaded: false }); }

module.exports = { MODELS, init, turnOn, turnOff, remove, reply, allowed: Prompt.allowed, status: () => status };
