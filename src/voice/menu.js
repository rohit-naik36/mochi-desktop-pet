// What the Settings > Voice menu shows, as plain data so it can be tested.
const Voices = require('./voices');

// petGender may still be unset early on; voices then follow the neutral set.
const genderOf = (state) => state.petGender || 'nonbinary';

function voiceMenuModel(state, packStatus, downloading = false) {
  const v = state.voice || {};
  const list = Voices.voicesFor(genderOf(state));
  const chosen = list.some((x) => x.id === v.voice) ? v.voice : (list[0] || {}).id;
  return {
    enabled: !!v.on,
    canEnable: packStatus === 'ready',
    voices: list.map((x) => ({
      id: x.id,
      label: x.id[0].toUpperCase() + x.id.slice(1) + ' (' + x.accent + ')' + (x.label ? ' · ' + x.label : ''),
      checked: x.id === chosen,
    })),
    pace: v.pace === 'slower' ? 'slower' : 'default',
    packAction: downloading ? 'downloading' : packStatus === 'ready' ? 'remove' : 'download',
  };
}

module.exports = { voiceMenuModel, genderOf };
