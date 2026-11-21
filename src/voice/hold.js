// One push-to-talk hold at a time. Starts on press, stops on release, and
// always stops by itself after maxMs, which can never exceed 30 s. stop() is safe to call any number of times.
const MAX_HOLD_MS = 30000;

function createHold({ onStart, onStop, maxMs = MAX_HOLD_MS, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const limit = Number.isFinite(maxMs) && maxMs > 0 ? Math.min(maxMs, MAX_HOLD_MS) : MAX_HOLD_MS;
  let on = false;
  let timer = null;
  function stop() {
    if (!on) return;
    on = false;
    if (timer) { clearTimer(timer); timer = null; }
    onStop();
  }
  function start() {
    if (on) return false;
    on = true;
    timer = setTimer(stop, limit);
    onStart();
    return true;
  }
  return { start, stop, active: () => on };
}

module.exports = { createHold, MAX_HOLD_MS };
