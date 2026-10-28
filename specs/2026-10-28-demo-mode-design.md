# Mochi Demo: guided tour for client demos

Status: draft for review (28 Oct 2026). No code yet.
Builds on `main` at 088b757 (PRs #3 to #7 merged).

## Goal

Let Rohit run a smooth, repeatable 5 to 10 minute demo of Mochi for Teams, on his own laptop or on a prospect's laptop, without a real call, real idle time, internet or a server.

Success looks like this:

1. A prospect installs one file and the tour works with no setup.
2. Every feature shown is the real app code. Only the trigger is simulated (a call starting, the keyboard going quiet).
3. A demo install can never be mistaken for real data, never sends anything, and never touches a real Mochi install.
4. The Store build contains no demo code path that can switch on.

## What already exists on main

Checked in the repo, not assumed:

- **Demo company.** `MOCHI-DEMO-2026` joins offline (`src/company.js`). The demo company has a campaign and a weekly question that follow the current week (`dailyCheckin` in `src/main.js`).
- **No sending in demo.** Sending totals is skipped when the company is a demo (`t.demo` check in `src/main.js`), and `MOCHI_SERVER` is unset unless set in the environment.
- **Real, manual triggers.** Manual silent mode (30 min, 1 hour, until off) and "Big call pep talk" are tray menu items. Both are real code and need no simulation.
- **Needs simulation.** Two things depend on the machine: call detection (`Calls.onCall()` reads Windows mic and camera use) and the break check (`powerMonitor.getSystemIdleTime()` inside `checkAway`).
- **Teams installer.** CI already builds `Mochi-Teams-Setup-<version>.exe` with the AI model bundled (`.github/workflows/build-windows.yml`). It is not on the public Release.
- **Pulse sample company.** The Pulse sign-in page has a "sample company" button that shows demo data (`pulse/start.js`).
- **Separate-app pattern.** `pulse/electron-builder.yml` already builds a second app from this repo with its own app ID and name.

## Design

### 1. A separate "Mochi Demo" app (chosen approach)

A third electron-builder config, `demo/electron-builder.yml`, built the same way as Pulse:

- App ID `com.mochi.demo`, product name `Mochi Demo`. A different product name gives a different user-data folder, so it never reads or writes real Mochi state.
- A build-time flag `mochiDemo: true` set through `extraMetadata`. Normal and Store builds do not set it.
- Output is an NSIS installer, `Mochi-Demo-Setup-<version>.exe`, with the AI model bundled (same cache and `tools/fetch-model.mjs` step as the Teams installer).
- `MOCHI_SERVER` is never set in this build, so `Company.hasServer()` is false. A test asserts this.

Rejected: a hidden demo menu inside the normal app. It would ship demo controls to every Store user and share real state.

### 2. Demo module with two injection points

A new `src/demo/` folder, loaded with `require` only when the flag is set.

- **Call seam.** `Calls.onCall()` gets an optional override. In demo, the tour sets it to report "on a call" for a chosen number of seconds. Everything after that is the real path: `checkCall`, `quietNow`, `sendQuiet`, the call count in insights.
- **Idle seam.** `checkAway` would read idle time through one small function (today it calls `powerMonitor.getSystemIdleTime()` directly) that the demo can override. The tour reports 45 seconds of idle, and the real "away" counting runs.
- **Seed week.** The tour can fill "your week" with a plausible sample week through `Insights.record`, so the insights preview is not empty. The Teams window already labels the company as a demo.

Each seam is one or two lines in existing files and does nothing unless the demo flag is set.

### 3. The tour

A small panel (frameless, always on top, next to the buddy) with Back, Next, "Show me" and a persistent "DEMO: sample data, nothing is sent" label. English only for v1.

| # | Step | What the client sees | Trigger |
|---|------|----------------------|---------|
| 1 | Meet Mochi | The buddy, five personalities, a greeting | Real, nothing to trigger |
| 2 | Join the company | Teams window, code `MOCHI-DEMO-2026`, company name, consent screen | Real join, code prefilled |
| 3 | A heavy day | "Feed me a worry" with a sample worry; the company's EAP, HR and POSH contacts show first; Smarter replies writes the reply on-device | Real, sample text prefilled |
| 4 | Quiet on calls | Mochi fades and holds a reminder while "a call" runs, then asks how it went | Simulated call (call seam) |
| 5 | A real break | Water reminder, Done, then the "real break" counter ticks up | Simulated idle (idle seam) |
| 6 | Big-call pep talk | Pep talk before a big call | Real menu action |
| 7 | What HR sees, and what they don't | Insights preview: exactly what is shared, groups under 8 hidden | Real preview, seeded week |
| 8 | The HR view | Mochi Pulse with the sample company | Real Pulse window, sample data |

Also in the tray menu of the demo app: **Restart tour** and **Reset demo** (clears the demo user-data and relaunches to a first-run state).

### 4. Smarter replies in the demo

The model is bundled in the demo installer, so there is no download. The model loads when "Feed me a worry" first opens, so step 3 can be slow the first time. The tour will call the existing `Ai.warm()` when it starts, so the model is loaded before step 3. If the model is missing or too slow, Mochi uses its written reply, which is the app's existing fallback. The tour never shows invented AI output.

### 5. Pulse inside the demo app

Pulse stays a separate app in production. The demo installer includes the Pulse files and opens them in their own window from step 8, with the sample company selected. No second install.

### 6. CI

A new workflow job, `Build Mochi Demo`, on `workflow_dispatch` and on branches named `demo-*`. It uploads `Mochi-Demo-Setup-<version>.exe` as an artifact only. It does not publish a Release and is never part of the Store package.

## Testing

- Unit tests (`node --test`): with the flag off the demo module does nothing and the seams return real values; with the flag on they return the injected values; the demo build has no server address.
- Existing tests (`campaigns`, `device`, `insights`) must still pass.
- A manual Windows checklist, because this environment cannot run the app: install, run all eight steps on a clean user, Reset demo, uninstall, and confirm a normal Mochi install on the same laptop is untouched.

## Out of scope

- Mac demo build.
- The real Teams server, licence checks and live Pulse.
- Hindi and Hinglish in the tour.
- Automatic screen recording. The backup recording is a manual capture of the tour.

## Risks and open questions

1. **Not runnable here.** I can build and unit-test the logic, but the packaged app needs a Windows test pass by Rohit before any client sees it.
2. **First-reply speed.** Model load time on a prospect's laptop is unknown. The 9 second reply limit already in `src/ai.js` falls back to the written reply.
3. **Installer size and trust.** The installer includes the model, so it is large. If the signing secrets are not set in CI it will be unsigned, and Windows SmartScreen will warn. Decision for Rohit: send it only to people who expect it, or set up signing first.
4. **Seams touch core logic.** Keeping each to one or two lines, with tests, limits the risk to the real call and break features.

## Decisions needed from Rohit

1. Approve this design, or say what to change.
2. Signed or unsigned demo installer for the first prospects.
3. Whether step 7 should show a seeded week (recommended) or only what the demo user has done so far.
