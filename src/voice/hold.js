// One push-to-talk hold at a time. Starts on press, stops on release, and
// always stops by itself after maxMs. stop() is safe to call any number of times.
function createHold({ onStart, onStop, maxMs = 30000, setTimer = setTimeout, clearTimer = clearTimeout }) {
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
    timer = setTimer(stop, maxMs);
    onStart();
    return true;
  }
  return { start, stop, active: () => on };
}

module.exports = { createHold };
