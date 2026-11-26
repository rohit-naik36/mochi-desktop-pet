// Decision logic for the Mac auto-updater (ADR 0001). Pure: no Electron, no
// network, no clock of its own, so it can be unit-tested.

const DAY_MS = 24 * 60 * 60 * 1000;

// The updater exists only in the signed, direct-download Mac build. Mac App
// Store, Microsoft Store, Windows, Linux, unpackaged and demo builds never
// load it.
function canAutoUpdate({ platform, mas, packaged, demo } = {}) {
  return platform === 'darwin' && !mas && !!packaged && !demo;
}

function defaultSettings() {
  return { enabled: true, noticeShown: false, lastCheck: 0 };
}

// Fill in anything missing or malformed from the saved state.
function normalize(saved) {
  const d = defaultSettings();
  const s = saved && typeof saved === 'object' ? saved : {};
  return {
    enabled: typeof s.enabled === 'boolean' ? s.enabled : d.enabled,
    noticeShown: s.noticeShown === true,
    lastCheck: Number.isFinite(s.lastCheck) ? s.lastCheck : d.lastCheck,
  };
}

// At most one check per 24 hours, never before the first-run notice, never
// when switched off. A last-check time slightly in the future (clock moved)
// counts as "just checked", so a clock change cannot cause extra checks.
function shouldCheck(settings, now) {
  const s = normalize(settings);
  if (!s.enabled || !s.noticeShown) return false;
  if (s.lastCheck > now) return s.lastCheck - now > DAY_MS; // far-future time is bogus; don't block forever
  return now - s.lastCheck >= DAY_MS;
}

// The only identifier sent: app name and version. No OS, device or user id.
function userAgent(version) {
  return `Mochi/${String(version)}`;
}

// Test-only route: an empty file with this name in the user data folder turns
// pre-releases on for that machine only. Nothing ships it, nothing creates it,
// there is no setting or UI for it, and it adds no network request.
const PRERELEASE_OPT_IN_FILE = 'allow-prerelease';

// Options applied to the updater. Tested as data. allowPrerelease is false
// unless the local opt-in file was found (second argument).
function updaterOptions(version, prereleaseOptIn = false) {
  return {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: prereleaseOptIn === true,
    allowDowngrade: false,
    requestHeaders: { 'User-Agent': userAgent(version) },
  };
}

module.exports = { PRERELEASE_OPT_IN_FILE, DAY_MS, canAutoUpdate, defaultSettings, normalize, shouldCheck, userAgent, updaterOptions };
