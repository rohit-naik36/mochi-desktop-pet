# ADR 0001: Mac auto-updater

Status: Proposed — pending Security & Privacy review
Issue: #50
Scope of this document: docs only. It changes no code and no protected file. It describes what the later build will touch.

## Context

Mac builds distributed outside the Mac App Store (the signed and notarized dmg) have no built-in way to update. Users would have to re-download by hand and may stay on old versions. The Mac App Store and Microsoft Store update their own apps, so they need nothing from us.

An update check is a new network request. Under the Charter this needs CEO approval, and it changes the privacy promise in `PRIVACY.md`. This ADR must ship inside the first signed Mac release, so Mac users have updates from day one.

## Decision

Add an opt-out automatic updater to the direct-download Mac build only:

- Library: `electron-updater`, with GitHub Releases of this repo as the provider.
- One check per day at most, quiet, with a Settings off-switch.
- Install only builds that are signed and notarized by us. Anything else is ignored.
- Disabled everywhere else: Mac App Store builds, Microsoft Store builds, Windows and Linux.

## Library

Chosen: `electron-updater` (works with `electron-builder`, reads `latest-mac.yml` from GitHub Releases, verifies the code signature on macOS). No server of our own to run.

Alternatives considered:
- Electron's built-in `autoUpdater` (Squirrel.Mac): needs a hosted update server or JSON endpoint; more to run and secure.
- `update-electron-app` / `update.electronjs.org`: free hosted service, but sends update requests through a third party. Rejected for privacy.
- Own check against the GitHub API plus "open download page": simplest, but no in-place install. Possible fallback if the review rejects auto-install.
- Sparkle: strong on macOS, but adds a native framework and a second release pipeline.

## What the release workflow must publish

For every Mac release, the GitHub Release must carry, next to the dmg:

- the Mac zip (the updater installs from the zip, not the dmg),
- `latest-mac.yml` (version, file names, sha512, sizes),
- both artifacts signed with the Developer ID certificate and notarized, with the ticket stapled.

The certificate and Apple credentials stay with the CEO and the existing signing setup. Agents never handle them. If the workflow cannot produce signed and notarized artifacts, no `latest-mac.yml` is published and the updater has nothing to find.

## Settings off-switch

- Name: "Check for updates automatically" (Settings, General).
- Default: on, for direct-download Mac builds only. Decided by the CEO and CTO.
- Persistence: a boolean in the existing local settings store, e.g. `autoUpdate.enabled`. Read at start-up; changing it takes effect immediately.
- The control is hidden, not just disabled, where the updater does not exist (see Disabled builds).

## First-run notice

Decided: on the first run of a direct-download Mac build, show a one-time notice with this exact wording:

> Mochi checks GitHub once a day for a signed update. You can turn this off any time in Settings.

- The notice links to the "Check for updates automatically" setting.
- Shown once. A local flag (e.g. `autoUpdate.noticeShown`) is persisted when it is shown, and it is never shown again.
- Direct-download Mac builds only. It is not shown on Mac App Store, Microsoft Store, Windows or Linux builds, where no check exists.
- No check is made before the notice has been shown.

## Check frequency and what is sent

- At most one check per 24 hours. The last check time is stored locally (`autoUpdate.lastCheck`) and compared at start-up and on a long timer. Restarting the app does not cause extra checks.
- The check is an HTTPS request to GitHub Releases for `latest-mac.yml` (and, if a newer version exists, the zip). It shares two things with GitHub: the user's IP address (inherent to any web request) and the app version. Nothing else is shared. We add no device or user ID, no settings, no usage data and no telemetry. Nothing is reported back to us.
- Accuracy note on the app version: it travels in the request's user-agent. Electron's default user-agent also carries the OS and Electron/Chromium versions, which would be more than "IP and app version". So the build must set an explicit minimal user-agent (for example `Mochi/<app version>`) on the updater's requests and must not rely on the library default. The unit test asserts the configured headers. If this cannot be done, the privacy wording must be widened to say so before release.
- No analytics on update success or failure.

## Every automatic connection, per edition

The updater is not the only thing that talks to a server by itself. This list is the complete set, checked against `src/company.js` and `src/main.js` (see the verification note below). "Automatic" means without the user pressing something at that moment.

Personal edition:
- Windows, Linux, Mac App Store, Microsoft Store (MSIX): none.
- Direct-download Mac: the update check. Sends the IP address and app version to GitHub, nothing else.

Teams edition (in addition to the above for its platform):
- (a) Daily licence check to the Teams server (Supabase, Mumbai). Sends the company join code, a one-way hash of the computer id, the app version and, on Windows, the Microsoft Entra tenant and domain. The server returns company contacts, team list, welcome note, campaigns and the weekly question. At most once every 20 hours (`src/main.js`).
- (b) Weekly team totals, only if the user turned them on. One finished week of counts, with no name, email or computer id, sent at a random time (up to about 36 hours after the week is ready).
- (c) The update check, on direct-download Mac builds only. Same as above: IP address and app version to GitHub.

Verification note: the only network calls in `src/` are `fetch` in `src/company.js` (`checkin`, `sendTotals`), used from `src/main.js`. No other automatic network use was found in `src/main.js`. Related, not automatic: joining a company with a code is a user action that uses the same check-in call; Feed me a worry runs the AI model on the device (the model is bundled, `tools/fetch-model.mjs` runs at build time only); the demo app turns the server off. The existing `PRIVACY.md` bullet "No internet connection (apart from Mochi for Teams, below...)" conflicts with a Mac update check and needs the matching approved edit below.

## Install rules

- Download only when `latest-mac.yml` lists a higher version than the running one.
- Verify the sha512 from `latest-mac.yml`, then verify the macOS code signature (Developer ID, our team) before installing. Gatekeeper/notarization must pass.
- Any failure at any step (bad hash, bad or missing signature, wrong team, not notarized): do nothing, keep the current version, discard the download.
- Install when the app next quits or restarts (`autoInstallOnAppQuit`). No forced restart, no interrupting a break or focus session.
- No downgrades and no pre-releases (`allowPrerelease` and `allowDowngrade` off).

## Failure behaviour

Offline, DNS or TLS error, GitHub rate limit, missing `latest-mac.yml`, bad signature: all silent. No dialog, no badge, no notification, no repeated retries. The last-check time is recorded (so a failure does not cause a retry loop) and the next attempt is the next day. Errors go only to the local log, with no URLs containing user data (there is none).

## Disabled builds

The updater module is never started unless all of these hold:

- `process.platform === 'darwin'`,
- `process.mas` is not set (not a Mac App Store build),
- the app is packaged (`app.isPackaged`),
- the Settings switch is on.

Microsoft Store (Windows), Windows direct builds and Linux never load it. Guard in one function (e.g. `canAutoUpdate({platform, mas, packaged})`) so it is unit-testable. Windows behaviour must not change. Store builds must also not contain a code path that makes the request.

## Proposed privacy wording

Proposed, needs CEO approval before PRIVACY.md changes. The same text, in page style, goes to `docs/privacy.html`.

> **Update checks (Mac, downloaded from our website only).** The Mac app checks GitHub about once a day to see whether a newer release exists. This check shares your IP address and the app version with GitHub, and nothing else. It sends nothing about you, your settings or how you use Mochi, and we receive no information from it. Updates are installed only if they are signed and notarized by us. The first time you run Mochi it tells you about this, and you can turn it off any time in Settings. Versions from the Mac App Store or Microsoft Store are updated by those stores and do not make this request.

The "No internet connection" bullet in `PRIVACY.md` ("No internet connection (apart from Mochi for Teams, below, if your employer uses it)") conflicts with this and needs a matching edit in the same approved change. Proposed replacement: "No accounts, analytics, tracking, advertising or cloud sync. Mochi makes no automatic internet connection, except the update check on the Mac version downloaded from our website (below) and, if your employer uses Mochi for Teams, the connections described under Mochi for Teams." The Mochi for Teams section should also list the Mac update check as an automatic connection when it applies.

(If review finds other "no network" wording in `PRIVACY.md` or `docs/privacy.html`, those lines need a matching edit in the same approved change.)

## Protected files the build will touch

Each needs CEO approval before the build PR can merge:

- `package.json`: add `electron-updater` dependency; `build` config for the Mac zip target and `publish` provider.
- `package-lock.json`: follows the dependency change.
- `.github/` build workflow: build, sign, notarize and upload the zip and `latest-mac.yml` to the release.
- `PRIVACY.md`: the wording above.
- `docs/privacy.html`: the same wording.
- `build/` config (entitlements, notarize settings) if the updater needs changes there.

Unprotected work: `src/` updater module, Settings UI, settings defaults, tests.

## Test plan

Unit tests (run in `npm test`, no network):
- `canAutoUpdate` for darwin / win32 / linux, `process.mas` true/false, packaged/unpackaged.
- Frequency: no check when `lastCheck` is under 24h; check when over; timestamp written after success and failure.
- Settings: default value, persistence, off means no check.
- Failure paths (offline, rate limit, bad signature) produce no UI call and schedule the next try for the next day.
- Updater is not imported or started in non-Mac and MAS paths.
- Request carries only the explicit minimal user-agent (app name and version) and no other identifiers (assert the configured options).
- First-run notice: shown once, flag persisted, not shown on non-Mac or store builds, no check before it is shown.

Manual, on a signed pre-release (CEO machine or CI Mac runner): update from N to N+1; tampered zip is rejected; unsigned zip is rejected; offline run is silent; switch off stops checks.

Windows path: existing tests must pass unchanged.

## Open questions

Answered and now part of the design: default on, and the one-time first-run notice.

1. Is "install on next quit" acceptable, or should we offer a "restart to update" prompt?
2. Does Security & Privacy want a pinned Developer ID team check in addition to the library's verification?
3. Does the first signed release need a manual test update path, since no earlier signed version exists to update from?

## Consequences

Users on direct Mac builds get fixes without action. We add one dependency and one outbound request to GitHub (IP address and app version), which must be disclosed, along with the full list of automatic connections. Release workflow becomes the single point that must keep producing signed, notarized artifacts.
