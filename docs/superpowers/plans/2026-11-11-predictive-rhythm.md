# Predictive Rhythm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mochi learns, per person and on the device, when each nudge (water, stretch, eyes) is likely to be acted on, defers it when unlikely, and uses the same signal for a softer mood check-in.

**Architecture:** One pure module `src/predict.js` (Beta counts per hour-of-week slot, plus a small mood model). The break check (keyboard/mouse idle) moves to `src/away.js` and runs for every user. `main.js` owns `state.rhythm`, records outcomes and answers the renderer's "should I fire now?" question over IPC; `pet.js` asks before showing a nudge.

**Tech Stack:** Plain JS (Electron 44), `node --test`, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-11-predictive-rhythm-design.md`

## Global Constraints

- No new dependencies. Tests run with `node --test test/*.test.js`.
- `state.rhythm` holds counts only: no text, no timestamps finer than the hour of the week. Never sent anywhere. Teams code (`insights.js`, `sendWeeks`, `teamsView`) never reads it.
- Learn-my-rhythm is **on by default**; menu has **Learn my rhythm** (checkbox) and **Forget my rhythm** (clears counts).
- Not ready = fewer than 14 effective observations in a slot: behave exactly as today (fixed timer).
- Act on a nudge only when the lower bound `lo` is at least 0.5. A deferred nudge never waits more than one extra interval (total gap at most 2x the normal interval).
- The break check (idle 20 s eyes, 45 s water, 60 s stretch, within 4 minutes) runs for everyone. The "sneaky" nudge and `noteInsight('away')` stay Teams-only.
- Crisis/heavy routing (`ai-prompt.js`, `worry.js`) is not touched.
- Every user-visible string exists in all three languages in `src/i18n.js`: `en`, `hi`, `hinglish`.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- The slot index must stay in 0-167 across the Sunday-to-Monday wrap and DST changes, and the neighbour hours must wrap (test in Task 1).
- `state.rhythm` missing, `null`, an old shape or garbage must load as empty and never throw (Task 1 `sanitize`, Task 4 load).
- A nudge that is never clicked must still teach the model: it is recorded as ignored when Mochi gets upset (Task 5).
- Learn-my-rhythm off: nothing is recorded and nothing is deferred; Forget leaves a usable empty state (Task 4).
- The predictor runs only after the existing guards (call, focus, asleep, away from desk, bubble waiting), so it can never fire a nudge those guards would hold (Task 5).

---

### Task 1: Rhythm model

**Files:**
- Create: `src/predict.js`
- Test: `test/predict.test.js`

**Interfaces:**
- Produces (CommonJS, also `root.Predict` in a browser, same wrapper as `src/pet-rules.js`):
  - `NUDGES = ['water','stretch','eyes']`, `SLOTS = 168`
  - `fresh(): Rhythm` where `Rhythm = { v: 1, on: true, w: { [nudge]: { a: number[168], b: number[168] } } }`
  - `sanitize(x: unknown): Rhythm` (anything not a valid Rhythm becomes `fresh()`; keeps `on` if boolean)
  - `slotOf(d: Date): number` (Monday 00:00 = 0, Sunday 23:00 = 167, local time)
  - `record(r: Rhythm, nudge: string, outcome: 'acted'|'ignored', d: Date): void` (ignores unknown nudge/outcome)
  - `predict(r: Rhythm, nudge: string, d: Date): { p: number, lo: number, hi: number, n: number, ready: boolean }`
  - `should(r: Rhythm, nudge: string, d: Date): boolean`
  - `wait(r: Rhythm, nudge: string, now: Date, dueSince: Date, maxMin: number): number` (minutes to wait, 0 = fire now)

- [ ] **Step 1: Write the failing tests** in `test/predict.test.js` (use `node:test`, `node:assert/strict`, as in `test/pet-rules.test.js`). Constants every test relies on: `DECAY = 0.97` per record in that slot, `NEIGHBOUR = 0.5` (the slots one hour either side count at half weight, wrapping around the week), `MIN_N = 14`, `Z = 1.28`, `THRESHOLD = 0.5`, `STEP_MIN = 15`. Tests:
  - `slotOf` returns 0 for Mon 2026-11-09 00:30, 167 for Sun 2026-11-15 23:59, and every hour of a DST-change week stays in 0..167.
  - Empty rhythm: `predict` gives `ready === false`, `n === 0`, `lo < 0.1`, `hi > 0.9`; `should` is true (falls back to fixed timer).
  - After 20 `acted` records at the same slot: `ready`, `p > 0.9`, range narrower than empty, `lo <= p && p <= hi`, `should` true.
  - After 20 `ignored` records: `ready`, `p < 0.2`, `should` false.
  - Neighbour sharing: 20 `acted` at 11:00 makes `predict` at 12:00 have `n > 0` and `p > 0.5`; at 16:00 `n === 0`.
  - Decay: 20 `acted` then 60 `ignored` at one slot ends with `p < 0.3`.
  - `wait`: slot unready returns 0; slot bad now with a good slot 45 minutes later returns 45; bad now and nothing good within `maxMin` returns 0; `dueSince` already `maxMin` minutes ago returns 0.
  - `sanitize(null)`, `sanitize('x')`, `sanitize({v:1,w:{water:{a:[1],b:[1]}}})` (wrong length) all equal `fresh()`; `sanitize({...fresh(), on:false}).on === false`.
  - `record` with an unknown nudge or outcome leaves the rhythm unchanged.

- [ ] **Step 2: Run** `node --test test/predict.test.js`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/predict.js`** with the signatures above. Per slot, effective counts are `a_s + 0.5(a_{s-1}+a_{s+1})` and the same for `b`, wrapping with `(s+167)%168`, `(s+1)%168`. `n = effective a + effective b` (prior excluded); prior is Beta(1,1), so `A = effA + 1`, `B = effB + 1`, `p = A/(A+B)`, `sd = sqrt(p(1-p)/(A+B+1))`, `lo = max(0, p - Z*sd)`, `hi = min(1, p + Z*sd)`, `ready = n >= MIN_N`. `record` multiplies the slot's `a` and `b` by `DECAY`, then adds 1 to `a` (acted) or `b` (ignored). `should = !ready || lo >= THRESHOLD`. `wait` returns 0 when `now - dueSince >= maxMin` minutes or when `should(now)` is true; otherwise it steps `STEP_MIN` minutes forward while time remains and returns the first step where `should` is true, else 0.

- [ ] **Step 4: Run** `node --test test/predict.test.js`. Expected: all PASS.

- [ ] **Step 5: Commit** `git add src/predict.js test/predict.test.js && git commit -m "Add the on-device rhythm model."`

---

### Task 2: Mood model

**Files:**
- Modify: `src/predict.js`
- Test: `test/predict.test.js`

**Interfaces:**
- Consumes: the module from Task 1.
- Produces:
  - `lowMoodChance(moods: Record<string, number>, today: string): { p, lo, hi, n, ready }` where `moods` is `state.moods` (`'YYYY-MM-DD'` to 1..5) and `today` is `'YYYY-MM-DD'`.
  - `softOpener(moods, today): boolean` true when `ready && lo >= 0.35`.

- [ ] **Step 1: Write failing tests:**
  - No history: `ready === false`, `softOpener === false`.
  - 30 days where three low days (1 or 2) are always followed by another low day, then `today` right after three low days: `ready`, `p > 0.7`, `softOpener === true`.
  - Same history but `today` follows three good days (4 or 5): `softOpener === false`.
  - Dates are plain strings parsed as local dates; the month/year boundary (`2026-12-31` then `2027-01-01`) counts as consecutive days.
  - A garbage `moods` value (`null`, an entry of `9`, an entry that is not a number) never throws.

- [ ] **Step 2: Run** `node --test test/predict.test.js`. Expected: FAIL, `lowMoodChance` not a function.

- [ ] **Step 3: Implement.** Context = mean of the previous 3 days' moods (needs at least 2 of the 3 days present) bucketed low `< 2.5`, mid `< 3.5`, high otherwise. For every past day with a mood and a valid context, tally that day's mood into the context's 5-way Dirichlet (prior 1 each). `lowMoodChance` takes the bucket of `today`'s previous 3 days, `A = count(1)+count(2)+2`, total `= tallies + 5`, and uses the same normal-approximation range as Task 1. Ignore values outside 1..5. `ready = tallies >= 14`.

- [ ] **Step 4: Run** `node --test test/predict.test.js`. Expected: PASS.

- [ ] **Step 5: Commit** `git add src/predict.js test/predict.test.js && git commit -m "Add the mood model for gentler check-ins."`

---

### Task 3: Break check for everyone

**Files:**
- Create: `src/away.js`
- Modify: `src/main.js:296-317` (replace `AWAY_SEC` and `checkAway`)
- Test: `test/away.test.js`

**Interfaces:**
- Consumes: `src/idle.js` (`Idle.get()`, `Idle.setOverride(fn)`).
- Produces: `AWAY_SEC = { eyes: 20, water: 45, stretch: 60 }` and `watch(key: string, opts: { onAway: () => void, onNoBreak: () => void, idle?: () => number, pollMs?: number, windowMs?: number }): () => void` (returns a stop function; defaults `pollMs = 2000`, `windowMs = 240000`, `idle = Idle.get`; exactly one of the callbacks fires, once, unless stopped; unknown `key` returns a no-op stop and fires nothing).

- [ ] **Step 1: Write failing tests** in `test/away.test.js`: idle reaching 60 for `stretch` before the window ends calls `onAway` once and never `onNoBreak`; idle staying at 10 through a 40 ms window (`pollMs: 5`) calls `onNoBreak` once; idle 59 for `stretch` is not away but 60 is; the returned stop function prevents both callbacks; `watch('bogus', ...)` fires nothing.

- [ ] **Step 2: Run** `node --test test/away.test.js`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/away.js`** by moving the polling logic out of `checkAway` unchanged in behaviour, with the idle source and timings injectable.

- [ ] **Step 4: Replace `checkAway` in `src/main.js`** with a version that calls `Away.watch(key, { onAway, onNoBreak })` for every user (drop the `!teamsOn()` early return). Keep the existing behaviour on the callbacks: `onAway` calls `noteInsight('away', key)` and `saveState()`; `onNoBreak` sends `'sneaky-' + key` under the same conditions as today **plus `teamsOn()`** (so non-Teams users never get the sneaky nudge). Task 4 adds the rhythm recording to these two callbacks.

- [ ] **Step 5: Run** `npm test`. Expected: all PASS.

- [ ] **Step 6: Commit** `git add src/away.js src/main.js test/away.test.js && git commit -m "Run the break check for everyone; keep the sneaky nudge for Teams."`

---

### Task 4: Main-process wiring and menu

**Files:**
- Modify: `src/main.js` (defaults near line 49-80, `loadState`, `checkAway` callbacks from Task 3, new IPC handlers, `buildMenu` around lines 695-830), `src/preload.js`, `src/i18n.js` (three languages: `menu.rhythm`, `menu.rhythmForget`, `tips.rhythm`)
- Test: extend `test/predict.test.js` only if logic moves; otherwise verified in Task 5

**Interfaces:**
- Consumes: `Predict.sanitize`, `Predict.record`, `Predict.wait` (Task 1); `Away.watch` callbacks (Task 3).
- Produces for the renderer, in `src/preload.js` under `window.pet`:
  - `rhythmWait(key: string, everyMin: number): Promise<number>` (minutes to wait, 0 = fire now)
  - `rhythmNote(key: string, outcome: 'ignored'): void`

- [ ] **Step 1: State.** Add `rhythm: null` to `defaults`; in `loadState`, after the existing merges, set `state.rhythm = Predict.sanitize(state.rhythm)`. Add `const Predict = require('./predict')` with the other requires.

- [ ] **Step 2: Recording.** Add `noteRhythm(nudge, outcome)`: returns if `!state.rhythm.on`, else `Predict.record(state.rhythm, nudge, outcome, new Date())` then `saveState()`. Call it from the two `Away.watch` callbacks (`'acted'` on away, `'ignored'` on no break), and from a new `ipcMain.on('rhythm-note', (_e, key, outcome) => ...)` that accepts only a key in `Predict.NUDGES` and `outcome === 'ignored'`.

- [ ] **Step 3: Ask.** `ipcMain.handle('rhythm-wait', (_e, key, everyMin) => number)`: returns 0 if `!state.rhythm.on` or `key` is not a nudge; clamps `everyMin` to 1..240; keeps a `dueSince` map (set to now on the first deferral, deleted when 0 is returned); returns `Predict.wait(state.rhythm, key, new Date(), new Date(dueSince[key] ?? Date.now()), everyMin)` rounded up to a whole minute.

- [ ] **Step 4: Menu.** Inside the Reminders area of `buildMenu`, add a checkbox **Learn my rhythm** (`checked: state.rhythm.on`, click toggles `state.rhythm.on`, saves) and an item **Forget my rhythm** (click sets `state.rhythm = Predict.fresh()` with `on` kept, saves). Follow how the existing `toggle` helper and `rows` list are built. Add the three strings in `en`, `hi`, `hinglish`, in the register of the neighbouring entries.

- [ ] **Step 5: Bridge.** Add `rhythmWait` and `rhythmNote` to `src/preload.js` next to `insight`.

- [ ] **Step 6: Verify** `npm test` passes and `node -e "require('./src/predict')"` loads. Then `npm start`, right-click the tray menu and confirm both items show, **Learn my rhythm** is ticked, and **Forget my rhythm** does not error. Expected: no console errors.

- [ ] **Step 7: Commit** `git add src/main.js src/preload.js src/i18n.js && git commit -m "Record when nudges are acted on, and add the rhythm menu items."`

---

### Task 5: Ask the model before a nudge

**Files:**
- Modify: `src/pet.js` (`fireNudge` ~line 261, `getUpset` ~line 275, `nudgeSnoozed` ~line 309, the `demo-nudge-` action at ~line 183)

**Interfaces:**
- Consumes: `window.pet.rhythmWait(key, everyMin)`, `window.pet.rhythmNote(key, 'ignored')` (Task 4).

- [ ] **Step 1:** Change `fireNudge(key, force = false)`. Keep every existing guard in place and in order. Replace the tail (from `if (mode === 'sleep')` to `scheduleNudge(key, nd.every())`) so it runs inside `window.pet.rhythmWait(key, nd.every()).then(...)` unless `force`. In the callback: if the result is greater than 0, `return scheduleNudge(key, minutes)`; if `bubbleSticky || upsetKey || asleep` became true while waiting, `return scheduleNudge(key, 2)`; otherwise run the unchanged tail. If the `rhythmWait` promise rejects, run the unchanged tail.

- [ ] **Step 2:** The `demo-nudge-` action calls `fireNudge(key, true)` so demos are never deferred.

- [ ] **Step 3:** Call `window.pet.rhythmNote(key, 'ignored')` at the top of `nudgeSnoozed` and in `getUpset` (once, after the `if (upsetKey) return` guard).

- [ ] **Step 4: Verify.** Run `npm test` (including `test/demo.test.js`, which must still pass). Then `npm start`, confirm a reminder still appears on the normal timer for a fresh install (not ready means no deferral), and that clicking Snooze does not error. Expected: reminders unchanged for a new user.

- [ ] **Step 5: Commit** `git add src/pet.js && git commit -m "Ask the rhythm model before showing a nudge, and learn from ignored ones."`

---

### Task 6: Softer mood check-in

**Files:**
- Modify: `src/main.js` (new `ipcMain.handle('rhythm-soft', ...)`), `src/preload.js`, `src/pet.js` (`askMood` ~line 449), `src/i18n.js` (new key `moodAskSoft` in all three languages)

**Interfaces:**
- Consumes: `Predict.softOpener(state.moods, todayKey)` (Task 2), where `todayKey` is the existing `Progress.dayKey()`.
- Produces: `window.pet.rhythmSoft(): Promise<boolean>`.

- [ ] **Step 1:** `rhythm-soft` returns `false` when `!state.rhythm.on`, else `Predict.softOpener(state.moods, Progress.dayKey())`.

- [ ] **Step 2:** In `askMood`, `await window.pet.rhythmSoft()` (default `false` on rejection) and say `T('moodAskSoft')` instead of `T('moodAsk')` when true. The buttons are unchanged. `moodAskSoft` is one gentle line that never mentions a prediction, a model or a number (for example "No pressure, just checking in. How are you today?"); write the Hindi and Hinglish lines in the register of `moodAsk`.

- [ ] **Step 3: Verify** `npm test` passes; with a hand-edited state file holding 14+ low-mood days, `npm start` and trigger the check-in from the menu: the soft line appears. Expected: soft line only in that state.

- [ ] **Step 4: Commit** `git add src/main.js src/preload.js src/pet.js src/i18n.js && git commit -m "Open the daily mood check-in gently when a low day looks likely."`

---

### Task 7: Privacy text and docs

**Files:**
- Modify: `PRIVACY.md` (under "What Mochi stores on your computer", line 11), `docs/faq.html`, `README.md`, `PROGRESS.md`

- [ ] **Step 1:** `PRIVACY.md`: add a short paragraph: Mochi counts, per hour of the week, whether you acted on each reminder (including whether the keyboard and mouse went quiet after you tapped Done, which uses only the time since your last input, never what you type); the counts stay on this computer, are never sent and never added to company totals; how to turn it off (**Learn my rhythm**) and clear it (**Forget my rhythm**).

- [ ] **Step 2:** Add one FAQ entry in `docs/faq.html` in the same markup as its neighbours, and a short README section "Learns your rhythm". Add one line to `PROGRESS.md`: on-device rhythm predictor built; the Puff reply-confidence piece (B) waits for the 15 Dec run.

- [ ] **Step 3: Verify** `npm test` passes; open `docs/faq.html` in a browser and confirm the entry renders.

- [ ] **Step 4: Commit** `git add PRIVACY.md docs/faq.html README.md PROGRESS.md && git commit -m "Explain the on-device rhythm learning."`
