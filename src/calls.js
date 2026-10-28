// Is the person on a call right now? Used only to keep Mochi quiet.
// Windows: the microphone or camera is in use by any app (the same signal as
// the mic icon in the taskbar). Mac: a Zoom meeting is running. Mochi never
// listens, records or looks at the screen; it only asks "in use: yes or no".
const { execFile } = require('child_process');

const run = (cmd, args) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: 4000, windowsHide: true }, (err, out) => resolve(err ? '' : String(out)));
});

// `reg query ...ConsentStore\microphone /s` output -> true if an app has
// started using the device and not stopped yet.
function deviceInUse(regText) {
  for (const block of String(regText || '').split(/\r?\n(?=HKEY_)/)) {
    const start = /LastUsedTimeStart\s+REG_QWORD\s+0x([0-9a-f]+)/i.exec(block);
    const stop = /LastUsedTimeStop\s+REG_QWORD\s+0x([0-9a-f]+)/i.exec(block);
    if (start && stop && /[1-9a-f]/i.test(start[1]) && !/[1-9a-f]/i.test(stop[1])) return true;
  }
  return false;
}

const STORE = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\';

// The demo app can stand in for a call (see src/demo). Other builds never set it.
let override = null;
function setOverride(fn) { override = typeof fn === 'function' ? fn : null; }

async function onCall() {
  if (override) return !!override();
  if (process.platform === 'win32') {
    const [mic, cam] = await Promise.all([run('reg', ['query', STORE + 'microphone', '/s']), run('reg', ['query', STORE + 'webcam', '/s'])]);
    return deviceInUse(mic) || deviceInUse(cam);
  }
  if (process.platform === 'darwin') return (await run('pgrep', ['-x', 'CptHost'])).trim() !== '';
  return false;
}

module.exports = { onCall, deviceInUse, setOverride };
