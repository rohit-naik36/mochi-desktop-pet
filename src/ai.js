// Smarter replies: a small open model that ships inside Mochi and runs on
// this laptop with node-llama-cpp. Nothing is sent anywhere and nothing is
// downloaded. It loads only when someone opens Feed me a worry, and is
// unloaded again after a while so it doesn't sit in memory all day.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const Prompt = require('./ai-prompt');
const CFG = require('./ai-models.json'); // Qwen3.5 small models: Apache 2.0, free for commercial use

const MODELS = CFG.models;
const REPLY_MS = 9000;          // slower than this and Mochi uses its written reply
const IDLE_MS = 10 * 60 * 1000; // unload after this long without a worry

let status = { state: 'missing', model: CFG.bundled, error: null, loaded: false };
let onStatus = () => {};
let llama = null, model = null, context = null, session = null, grammar = null, busy = Promise.resolve();
let idleTimer = null;

function setStatus(patch) { status = { ...status, ...patch }; onStatus(status); }

// Packaged: <resources>/models/<id>.gguf. From the repo: models/<id>.gguf
// (tools/fetch-model.mjs puts it there).
function modelFile(id = status.model) {
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  return path.join(base, 'models', id + '.gguf');
}

// state: 'missing' (this build has no model), 'off' (turned off in
// Settings) or 'ready'.
function init(saved, cb) {
  onStatus = cb || onStatus;
  const id = process.env.MOCHI_AI_MODEL in MODELS ? process.env.MOCHI_AI_MODEL : CFG.bundled;
  status = { state: 'missing', model: id, error: null, loaded: false };
  if (fs.existsSync(modelFile(id))) setStatus({ state: saved && saved.on === false ? 'off' : 'ready' });
}

async function load() {
  if (session) return session;
  const L = await import('node-llama-cpp');
  llama = llama || await L.getLlama({ gpu: 'auto' });
  model = await llama.loadModel({ modelPath: modelFile() });
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
// warm() loads the model in the background when Feed me a worry opens, so
// the reply doesn't wait for it. Until it's loaded, Mochi uses the written
// reply.
let warming = null;
function touch() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!warming) unload().then(() => setStatus({ loaded: false })); }, IDLE_MS);
}
function warm() {
  if (status.state !== 'ready') return;
  touch();
  if (session || warming) return;
  setStatus({ loaded: false });
  warming = load()
    .then(() => setStatus({ loaded: true, error: null }))
    .catch((e) => { unload(); setStatus({ state: 'error', error: 'could not start: ' + String(e.message || e).slice(0, 120) }); })
    .finally(() => { warming = null; });
}

function reply(req) {
  if (!session) { warm(); return Promise.resolve(null); }
  touch();
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

async function turnOff() { if (status.state === 'missing') return; await unload(); setStatus({ state: 'off', loaded: false }); }
function turnOn() { if (status.state !== 'missing') setStatus({ state: 'ready', error: null }); }

module.exports = { MODELS, init, turnOn, turnOff, warm, reply, allowed: Prompt.allowed, status: () => status };
