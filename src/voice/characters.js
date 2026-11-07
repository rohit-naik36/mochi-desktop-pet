// The buddies Mochi can be, and how each name is SAID and HEARD by voice.
// Keep in step with SKINS in main.js (test/voice-characters.test.js fails if they drift).
//   say   - the exact phonemes the voice uses for the name, so no dictionary guess is involved
//   heard - what the microphone model tends to write instead of the name. ONLY list
//           non-words here: "hope", "mist" and "dusk" are ordinary English, so rewriting
//           them would turn "I hope" into "I Hope".
const CHARACTERS = [
  { id: 'smoke', name: 'Mochi', say: 'mˈoʊtʃi', heard: [] }, // Mochi's misspellings live in text.js
  { id: 'cinder', name: 'Cinder', say: 'sˈɪndɚ', heard: ['sinder', 'cynder', 'cindar'] },
  { id: 'mist', name: 'Mist', say: 'mˈɪst', heard: [] },
  { id: 'dusk', name: 'Dusk', say: 'dˈʌsk', heard: [] },
  { id: 'hope', name: 'Hope', say: 'hˈoʊp', heard: [] },
];

// lowercase name -> phonemes, for the phonemizer
function sayMap() {
  const out = {};
  for (const c of CHARACTERS) out[c.name.toLowerCase()] = c.say;
  return out;
}

// [{ to, heard }] for fixTranscript
function heardFixes() {
  return CHARACTERS.filter((c) => c.heard.length).map((c) => ({ to: c.name, heard: c.heard }));
}

module.exports = { CHARACTERS, sayMap, heardFixes };
