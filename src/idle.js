// How long the keyboard and mouse have been quiet, in seconds. One place so the
// demo app can stand in for a real break (see src/demo). Other builds never set
// an override.
let override = null;

function get() {
  if (override) return override();
  return require('electron').powerMonitor.getSystemIdleTime();
}

function setOverride(fn) { override = typeof fn === 'function' ? fn : null; }

module.exports = { get, setOverride };
