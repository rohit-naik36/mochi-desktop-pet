# Predictive rhythm: Mochi learns when you act on a nudge

Date: 2026-11-11. Status: draft for review. Owner: Rohit Naik.
Scope: piece A only. Piece B (Puff v2 reply confidence) is a separate spec after the 15 Dec scored run.

## Goal

Mochi nudges (water, stretch, eyes) when the person is likely to act and waits when they are not. It says how sure it is. No neural network, no training data, nothing leaves the device.

## Understanding

- Said by the founder: a small, predictive and probabilistic model specific to Mochi; on by default; ensure users actually do the task (keyboard/mouse check).
- Assumed: counts per person on their own laptop are enough. "No user data" in `mochi_slm` is about training data, so on-device learning does not break it, but `PRIVACY.md` must say so.

## Model (`src/predict.js`, pure functions)

- Per nudge, per hour-of-week slot (168): Beta(α, β). Outcome `acted` adds to α; `ignored` (snoozed, or no real break) adds to β. Prior Beta(1, 1).
- Neighbouring hours share a fraction of each other's counts. Old counts decay slowly so a changed routine is picked up in weeks.
- `predict(rhythm, nudge, now)` returns `{ p, lo, hi, n }`. `should(...)` is true only when `lo` ≥ 0.5.
- With n < 14 in a slot the model returns "not ready" and the existing fixed timer is used unchanged.
- A deferred nudge waits for the next good slot but never longer than 2x its normal interval, so a reminder cannot vanish.
- Mood: Dirichlet over moods 1-5 given the previous 3 days. Only effect: a softer opener at the next daily check-in. Never a stated prediction.

## Outcome signal: what counts as "acted"

Mochi already has two signals:

1. **Done click.** Weak: a person can click without doing the break.
2. **Real break check** (`checkAway`, `src/main.js:299`). After Done, it polls `powerMonitor.getSystemIdleTime()` (time since last input; never key content). Idle for 20 s (eyes), 45 s (water) or 60 s (stretch) within 4 minutes = really away.

Today the break check runs only when `teamsOn()` is true and its result is recorded only in the Teams weekly counts. It does not run for everyone.

Decision in this spec: run the idle check for **everyone** as a local-only signal for the rhythm. A Done click followed by a real break = `acted`; a Done click with no break, or a snooze = `ignored`. The playful "sneaky" nudge and the Teams counts stay Teams-only, exactly as now.

## Integration

- `state.rhythm` is new and separate from `state.insights`. Teams never reads it.
- Record beside the existing `track` / `insight` handlers in `main.js`.
- Gate each reminder with `Predict.should(...)` before it fires.
- Menu: **Learn my rhythm** (checked by default) and **Forget my rhythm** (clears `state.rhythm`).

## Privacy

Only counts per hour-of-week, no text, no finer timestamps, a few KB in the state file, never sent. Add a short `PRIVACY.md` paragraph and a website FAQ line: what is counted, where it stays, how to switch off or clear.

## Tests

`test/predict.test.js`: empty slot gives wide range and falls back; 20 acted outcomes narrow the range and raise p; lo <= p <= hi; 2x deferral cap; decay; Forget returns empty state. One replay script: a made-up person who always stretches at 11am and never at 4pm is learned within about 2 weeks. Idle check test uses `Idle.setOverride`.

## Out of scope

Piece B, any neural model, anything sent off-device, Hindi/Hinglish wording changes, changes to crisis routing.

## Open points

- Idle time is system-wide input idle, so reading a book or a phone call at the desk counts as a break, and a person who walks away without clicking Done is not recorded. Accepted for v1.
- `reportActivity` (`main.js:836`) and `main.js:206` read the OS idle time directly, bypassing `idle.js`, so the demo override does not affect them. Not changed here.
