// Who may use the microphone: one hidden recorder window, audio only, and
// only while a push-to-talk hold is active. Everything else is denied.
function createPolicy({ recorderId, holdActive }) {
  const mayRecord = (wcId) => {
    const id = recorderId();
    return id != null && wcId === id && !!holdActive();
  };
  const onlyAudio = (types) => Array.isArray(types) && types.length === 1 && types[0] === 'audio';
  return {
    request: (wcId, permission, details) => permission === 'media' && mayRecord(wcId) && onlyAudio(details && details.mediaTypes),
    check: (wcId, permission, details) => permission === 'media' && mayRecord(wcId) && !!details && details.mediaType === 'audio',
  };
}

module.exports = { createPolicy };
