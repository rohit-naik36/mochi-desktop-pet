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
- Default: on, for direct-download Mac builds only. (Open question 1.)
- Persistence: a boolean in the existing local settings store, e.g. `autoUpdate.enabled`. Read at start-up; changing it takes effect immediately.
- The control is hidden, not just disabled, where the updater does not exist (see Disabled builds).

## Check frequency and what is sent

- At most one check per 24 hours. The last check time is stored locally (`autoUpdate.lastCheck`) and compared at start-up and on a long timer. Restarting the app does not cause extra checks.
- The only thing sent is the HTTPS request itself to GitHub Releases for `latest-mac.yml` (and, if a newer version exists, the zip). GitHub sees the usual request metadata such as the IP address, as with any download. We add no identifiers, no device or user ID, no custom headers beyond the library default, and no telemetry. Nothing is reported back to us.
- No analytics on update success or failure.

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

> **Update checks (Mac, downloaded from our website only).** The Mac app checks for a new version about once a day by asking GitHub whether a newer release exists. This is the only network request the app makes by itself. It sends nothing about you, your settings or how you use Mochi, and we receive no information from it. GitHub may see your IP address in the normal way for any download from its servers. Updates are installed only if they are signed and notarized by us. You can turn this off in Settings. Versions from the Mac App Store or Microsoft Store are updated by those stores and do not make this request.

(If review finds that the existing "no network" wording elsewhere in `PRIVACY.md` conflicts, those lines need a matching edit in the same approved change.)

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
- Request contains no extra headers or identifiers (assert the configured options).

Manual, on a signed pre-release (CEO machine or CI Mac runner): update from N to N+1; tampered zip is rejected; unsigned zip is rejected; offline run is silent; switch off stops checks.

Windows path: existing tests must pass unchanged.

## Open questions

1. Default on or off? Proposal is on, with clear disclosure in `PRIVACY.md` and a Settings switch.
2. Should the first run show a one-line notice about update checks?
3. Is "install on next quit" acceptable, or should we offer a "restart to update" prompt?
4. Does Security & Privacy want a pinned Developer ID team check in addition to the library's verification?
5. Does the first signed release need a manual test update path, since no earlier signed version exists to update from?

## Consequences

Users on direct Mac builds get fixes without action. We add one dependency and one outbound request to GitHub, which must be disclosed. Release workflow becomes the single point that must keep producing signed, notarized artifacts.
