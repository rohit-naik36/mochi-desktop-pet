// The six Mochi voices (chosen by ear, 6 Nov 2026). Gender picks which two
// are offered. `label` is the one-word feel label, still to be supplied.
const SLOWER_FACTOR = 0.9;

const VOICES = [
  { id: 'heart', kokoro: 'af_heart', gender: 'female', accent: 'US', pace: 0.9, label: null },
  { id: 'bella', kokoro: 'af_bella', gender: 'female', accent: 'US', pace: 0.95, label: null },
  { id: 'puck', kokoro: 'am_puck', gender: 'male', accent: 'US', pace: 0.9, label: null },
  { id: 'echo', kokoro: 'am_echo', gender: 'male', accent: 'US', pace: 0.9, label: null },
  { id: 'fable', kokoro: 'bm_fable', gender: 'nonbinary', accent: 'UK', pace: 0.9, label: null },
  { id: 'alloy', kokoro: 'af_alloy', gender: 'nonbinary', accent: 'US', pace: 0.95, label: null },
];
// Held back, not offered.
const SPARES = [
  { id: 'isabella', kokoro: 'bf_isabella', gender: 'female', accent: 'UK', pace: 0.9, label: null },
  { id: 'fenrir', kokoro: 'am_fenrir', gender: 'nonbinary', accent: 'US', pace: 0.9, label: null },
];

const byId = (id) => VOICES.find((v) => v.id === id) || null;
const voicesFor = (gender) => VOICES.filter((v) => v.gender === gender);
const defaultVoice = (gender) => (voicesFor(gender)[0] || {}).id || null;

// Words per second multiplier handed to the engine.
function speedFor(voiceId, pace) {
  const base = (byId(voiceId) || VOICES[0]).pace;
  return Math.round(base * (pace === 'slower' ? SLOWER_FACTOR : 1) * 100) / 100;
}

module.exports = { VOICES, SPARES, SLOWER_FACTOR, byId, voicesFor, defaultVoice, speedFor };
