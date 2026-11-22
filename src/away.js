// After "Done" on a break reminder: did the keyboard and mouse really go quiet
// for a moment within a few minutes? Only yes or no comes out. Idle time is the
// OS's "seconds since the last input"; what is typed is never seen.
const AWAY_SEC = { eyes: 20, water: 45, stretch: 60 };

// Exactly one of onAway / onNoBreak fires, once, unless stop() is called first.
function watch(key, { onAway, onNoBreak, idle, pollMs = 2000, windowMs = 4 * 60 * 1000 } = {}) {
  const need = AWAY_SEC[key];
  if (!need) return () => {};
  const read = idle || (() => require('./idle').get());
  const started = Date.now();
  const timer = setInterval(() => {
    if (read() >= need) { clearInterval(timer); onAway && onAway(); }
    else if (Date.now() - started > windowMs) { clearInterval(timer); onNoBreak && onNoBreak(); }
  }, pollMs);
  return () => clearInterval(timer);
}

module.exports = { AWAY_SEC, watch };
