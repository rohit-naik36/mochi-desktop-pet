// The buddies Mochi can be, and what the microphone model tends to write for each name.
// Keep in step with SKINS in main.js (test/voice-transcript.test.js fails if they drift).
//   heard - near misses the model writes instead of the name. ONLY list non-words here:
//           "hope", "mist" and "dusk" are ordinary English, so rewriting them would turn
//           "I hope" into "I Hope".
const CHARACTERS = [
  { id: 'smoke', name: 'Mochi', heard: [] }, // Mochi's misspellings live in transcript.js
  { id: 'cinder', name: 'Cinder', heard: ['sinder', 'cynder', 'cindar'] },
  { id: 'mist', name: 'Mist', heard: [] },
  { id: 'dusk', name: 'Dusk', heard: [] },
  { id: 'hope', name: 'Hope', heard: [] },
];

// [{ to, heard }] for fixTranscript
function heardFixes() {
  return CHARACTERS.filter((c) => c.heard.length).map((c) => ({ to: c.name, heard: c.heard }));
}

module.exports = { CHARACTERS, heardFixes };
