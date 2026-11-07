# Mochi Voice (v0.13.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optional, off-by-default English voice for Mochi: speak replies aloud and listen to a worry by push-to-talk, fully on the user's PC.

**Architecture:** All model code runs in one Node utility process owned by the main process (`src/voice/host.js` talks to `src/voice/worker.js`). Windows never load model code. The play window plays PCM it receives over IPC. One hidden recorder window is the only window ever granted the microphone, and only during a hold. Models come from an optional pack downloaded by the main process.

**Tech Stack:** Electron 44.7.0 (utilityProcess), kokoro-js (Kokoro-82M fp32), @huggingface/transformers (Whisper base.en, ONNX), Node `assert` tests run by `node --test test/*.test.js`.

**Spec:** `specs/2026-11-06-voice-design.md` (approved by the founder on 7 Nov 2026, as written).

## Global Constraints

- English only; Hindi and Hinglish replies are never spoken. Voice is off by default.
- Windows only for 0.13.0 (the spec says "own PC"; macOS and the Mac App Store build get no voice and no entitlement changes). **Plan decision, confirm at review.**
- No audio is ever written to disk. No network use except the one-time pack download, done by the main process.
- Windows `src/*.html` keep `default-src 'self'`; the sandbox and context isolation settings do not change.
- Voice speaks exactly the text shown on screen, after the existing crisis and heavy-wording routing. Helpline lines are never paraphrased.
- "Mochi" is respelled "Mo-chee" before synthesis (never "Moh chee").
- Models unload after 10 minutes idle. Max hold 30 seconds. Transcripts never auto-send.
- Six voices and paces, exactly: Heart 0.90 and Bella 0.95 (female); Puck 0.90 and Echo 0.90 (male); Fable 0.90 (UK) and Alloy 0.95 (nonbinary). Spares: Isabella, Fenrir.
- Tests are plain `assert` scripts in `test/*.test.js` (the repo style). Shared browser/Node files use the `(function (root) {...})(typeof window !== 'undefined' ? window : globalThis)` pattern from `src/pet-rules.js`.
- Commits: author rohit-naik36 (check `git config user.name/email` first), **no Claude attribution lines** in commits or PRs.
- The sandbox has no GPU and no huggingface.co or npm access: Tasks 6, 11 and 12 finish on Rohit's Windows PC.
- Do not edit `docs/` except in Task 12 (it is the live website).

## Review Focus

1. **Microphone unavailable or blocked in Windows privacy settings, or no input device.** The mic button shows a plain message; typing still works; nothing throws. (Task 8)
2. **Tap-release under ~300 ms, or silence.** Empty transcript leaves the textbox untouched and shows no error. (Task 8)
3. **Hold left dangling:** window closed, voice turned off, recorder crashed, or app quit during a hold. The hold flag clears, the microphone is denied again, and silent-mode detection resumes. (Task 8)
4. **Reply speaking when the user acts:** new reply, closing the play window, pressing the speaker button, or turning voice off mid-sentence stops audio at once with no leftover queue. (Task 7)
5. **Pack download interrupted, corrupt, or disk full.** The bad file is deleted, voice stays off, the message is plain, and a retry resumes. (Task 2)

Also covered by tests: replies in Hindi or Hinglish are not spoken; empty or punctuation-free text; digits and helpline numbers.

## File Structure

| File | Responsibility |
|---|---|
| `src/voice/text.js` (create) | Pure text helpers: `splitSentences`, `respell`, `fixTranscript`, `replyLines`. Browser and Node. |
| `src/voice/voices.js` (create) | The six voices, `voicesFor`, `speedFor`. |
| `src/voice/pack.js` (create) | Pack paths, status, resumable verified download, remove. |
| `src/voice/pack-manifest.json` (create) | Files, byte sizes, SHA-256 of the pack. Filled by Task 11's tool. |
| `src/voice/permissions.js` (create) | Pure permission policy for the two Electron handlers. |
| `src/voice/host.js` (create) | Main-side owner of the utility process: requests, idle unload, speed test. |
| `src/voice/worker.js` (create) | Utility-process entry. Loads engines, answers `tts` and `stt`. |
| `src/voice/engine.js` (create) | Real Kokoro and Whisper wrappers behind `{ tts, stt }`. |
| `src/voice/index.js` (create) | Main-side facade; the only thing `main.js` requires, and only when voice is on. |
| `src/voice-player.js` (create) | Play-window playback queue (Web Audio). |
| `src/recorder.html`, `src/recorder.js`, `src/recorder-worklet.js`, `src/recorder-preload.js` (create) | Hidden recorder window: capture, resample to 16 kHz mono. |
| `src/calls.js` (modify) | Ignore Mochi's own microphone entry; pause during a hold. |
| `src/main.js` (modify) | Defaults, permission handlers (~line 991), Voice submenu in `buildMenu()` (~line 743), IPC, hold lifecycle. |
| `src/play.js`, `src/play.html`, `src/play-preload.js`, `src/i18n.js` (modify) | Speak after reply, speaker and mic buttons, strings. |
| `tools/make-voice-pack.js` (create) | Run on the PC: download models, write the pack and manifest. |
| `package.json`, `build/` (modify) | Dependencies, `asarUnpack`, Store microphone capability, licence list. |

## State shape (used by every task)

`state.voice = { on: false, voice: null, pace: 'default', packVersion: null }` added to `defaults` in `src/main.js`; `voice` is a voice id from `voices.js`, `pace` is `'default' | 'slower'`. `loadState()` merges it like `state.ai`.

---

### Task 1: Text helpers

**Files:**
- Create: `src/voice/text.js`
- Test: `test/voice-text.test.js`

**Interfaces:**
- Produces: `VoiceText.splitSentences(text: string): string[]`, `VoiceText.respell(sentence: string, names?: string[]): string`, `VoiceText.fixTranscript(raw: string, names?: string[]): string`, `VoiceText.replyLines(r: object): string[]`.

- [ ] **Step 1: Write failing tests** in `test/voice-text.test.js`:
  - `splitSentences('Hi there. How are you? Fine!')` equals `['Hi there.', 'How are you?', 'Fine!']`.
  - `splitSentences('no punctuation at all')` equals `['no punctuation at all']`; `splitSentences('  ')` equals `[]`; `splitSentences('Call 1800-599-0019. Or text.')` has length 2 (digits do not split).
  - `respell('Mochi is here, Mochi.')` equals `'Mo-chee is here, Mo-chee.'`; `respell('mochi')` equals `'Mo-chee'`; `respell('Mochikins')` is unchanged (whole word only).
  - `fixTranscript('hey mochie i feel bad')` equals `'hey Mochi i feel bad'`; also maps `mo chi`, `mochee`, `mochy`; `fixTranscript('')` equals `''`.
  - `replyLines({lang:'en', opener:'', reflect:'A', comfort:'B', step:'C', ask:'D', helplines:[{name:'KIRAN',number:'1'}]})` returns the on-screen order opener, reflect, comfort, helplines (as `name + ', ' + number`), step, ask, with empty entries dropped; `replyLines({lang:'hi', ...})` and `lang:'hinglish'` return `[]`.
- [ ] **Step 2: Run** `node --test test/voice-text.test.js`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement the four functions** in `src/voice/text.js` in the UMD pattern. Split on `.`, `!`, `?` followed by whitespace, keeping the mark; respell with word-boundary case-insensitive regexes. `names` is an optional extra list of `[from, to]` pairs (buddy names Cinder, Mist, Dusk, Hope get no respelling until Rohit supplies spellings). Read `src/play.js` `showReply()` before writing `replyLines` and mirror exactly what it puts on screen, including how helplines are shaped.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(voice): text helpers`.

### Task 2: Voice pack manager

**Files:**
- Create: `src/voice/pack.js`, `src/voice/pack-manifest.json` (placeholder entries with `sha256: "TBD-FROM-TASK-11"`)
- Test: `test/voice-pack.test.js`

**Interfaces:**
- Produces: `packDir(userDataPath: string): string` (`<userData>/voice-pack`), `status(dir: string, manifest): 'missing' | 'partial' | 'ready'`, `download({ dir, manifest, baseUrl, onProgress?, signal? }): Promise<{ ok: true } | { ok: false, reason: 'network' | 'hash' | 'disk' }>`, `remove(dir: string): void`, `sha256File(path: string): Promise<string>`. Manifest shape: `{ version: string, totalBytes: number, files: [{ name, bytes, sha256 }] }`.

- [ ] **Step 1: Write failing tests** against a local `http.createServer` serving fixture files (with `Range` support), no real network:
  - happy path: `download` returns `{ok:true}`, `status` becomes `'ready'`, `onProgress` called with increasing bytes.
  - wrong hash: returns `{ok:false, reason:'hash'}` and the file is deleted from `dir`.
  - interrupted: server closes after N bytes → `{ok:false, reason:'network'}`, a `.part` file remains, a second `download` resumes using a `Range` header (assert the server saw `bytes=N-`) and finishes `'ready'`.
  - disk full (inject by pointing `dir` at a read-only path) → `reason:'disk'`.
  - `remove` deletes everything under `dir`; `status` is then `'missing'`.
  - `signal.abort()` stops the download and leaves `.part`.
- [ ] **Step 2: Run** `node --test test/voice-pack.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** with Node `http`/`https` and `fs.createWriteStream` (append mode for resume); stream the hash while writing; verify before renaming `.part` to final. A file is only trusted if its name has no `.part` suffix and hash matches on `status` for files modified since last check (store verified marker `<name>.ok`).
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(voice): resumable verified pack download`.

### Task 3: Voices and pace

**Files:**
- Create: `src/voice/voices.js`
- Test: `test/voice-voices.test.js`

**Interfaces:**
- Produces: `VOICES: [{ id, kokoro, gender, accent, pace, label }]`, `voicesFor(gender: 'male'|'female'|'nonbinary'): [voice, voice]`, `defaultVoice(gender): string`, `speedFor(voiceId: string, pace: 'default'|'slower'): number`, `SPARES`.
  Kokoro ids: `af_heart`, `af_bella`, `am_puck`, `am_echo`, `bm_fable`, `af_alloy`; spares `bf_isabella`, `am_fenrir`. `label` is `null` until Rohit supplies the one-word feel labels (open item 1).

- [ ] **Step 1: Write failing tests:** `voicesFor('female')` ids are exactly `['heart','bella']`; male `['puck','echo']`; nonbinary `['fable','alloy']`; `speedFor('heart','default')` is 0.9, `speedFor('bella','default')` 0.95, `speedFor('fable','slower')` is `0.9 * 0.9` rounded to 2 places (0.81); `voicesFor('bogus')` returns `[]`; no spare appears in any `voicesFor` result.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The "slower" multiplier 0.9 is a plan decision (the spec gives "slower / default" without a number); keep it as one named constant `SLOWER_FACTOR`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(voice): six voices and pace`.

### Task 4: Microphone permission policy

**Files:**
- Create: `src/voice/permissions.js`
- Modify: `src/main.js` (~line 991, inside `web-contents-created`)
- Test: `test/voice-permissions.test.js`

**Interfaces:**
- Produces: `createPolicy({ recorderId: () => number | null, holdActive: () => boolean })` returning `{ request(wcId: number, permission: string, details?: object): boolean, check(wcId: number, permission: string, details?: object): boolean }`.
- Consumes (from Task 8): the recorder window's `webContents.id` and the hold flag.

- [ ] **Step 1: Write failing tests (full matrix):** allow only when `wcId === recorderId()` AND `holdActive()` AND `permission === 'media'` AND the requested media types are exactly audio (`details.mediaTypes` equals `['audio']` for `request`; `details.mediaType === 'audio'` for `check`). Deny: another window with an active hold; the recorder with no hold; the recorder asking `'media'` with video or audio+video; the recorder asking `'geolocation'`, `'notifications'`, `'clipboard-read'`; `recorderId()` null.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement the policy**, then in `main.js` replace the deny-all line with `setPermissionRequestHandler((wc, perm, cb, details) => cb(policy.request(wc.id, perm, details)))` and add `setPermissionCheckHandler((wc, perm, _origin, details) => policy.check(wc.id, perm, details))`. Until Task 8 supplies real values the policy is created with `recorderId: () => null`, so behaviour is unchanged (all denied).
- [ ] **Step 4: Run tests.** Expected: PASS. Run `npm test`; Expected: all existing tests still PASS.
- [ ] **Step 5: Commit** `feat(voice): permission policy, still deny-all by default`.

### Task 5: Silent mode ignores Mochi's own microphone use

**Files:**
- Modify: `src/calls.js`
- Test: `test/calls.test.js` (create)

**Interfaces:**
- Produces: `deviceInUse(regText: string, opts?: { own?: string[] }): boolean`, `ownTokens(): string[]`, `setPaused(paused: boolean): void`; `onCall()` returns `false` while paused.

- [ ] **Step 1: Write failing tests** using `reg query` text fixtures (one `HKEY_` block per app, `LastUsedTimeStart` non-zero and `LastUsedTimeStop` zero means in use):
  - another app in use → `true` (existing behaviour kept).
  - only Mochi's block in use, Store form: key ends with `LittleSmokeStudio.Mochi-DeskBuddy_<publisherId>` → `false` with `own: ['littlesmokestudio.mochi-deskbuddy_']`.
  - only Mochi's block, unpackaged form: key under `NonPackaged` ending `C:#Program Files#Mochi#Mochi.exe` → `false` with `own: ['c:#program files#mochi#mochi.exe']`.
  - Mochi in use AND another app in use → `true`.
  - match is case-insensitive; no `own` option behaves exactly as before.
  - `setPaused(true)` makes `onCall()` resolve `false` even when `setOverride(() => true)` is set; `setPaused(false)` restores it.
- [ ] **Step 2: Run** `node --test test/calls.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** `deviceInUse` skips any block whose first line (the key) lower-cased contains an `own` token. `ownTokens()` returns the Store identity prefix `littlesmokestudio.mochi-deskbuddy_` plus `process.execPath` lower-cased with `\` replaced by `#`. `onCall` passes `ownTokens()` for the microphone query only.
- [ ] **Step 4: Run tests.** Expected: PASS. Run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(voice): silent mode ignores Mochi's own mic use`.

### Task 6: Voice host and worker

**Files:**
- Create: `src/voice/host.js`, `src/voice/worker.js`, `src/voice/engine.js`
- Test: `test/voice-host.test.js` (uses a fake worker script, no models)

**Interfaces:**
- Consumes: `speedFor` (Task 3).
- Produces: `createHost({ spawn: () => WorkerChannel, idleMs = 600000 })` returning:
  - `speak({ sentences: string[], voice: string, speed: number, onAudio: (chunk: { pcm: Float32Array, rate: number, index: number, last: boolean }) => void }): Promise<void>` (sentences are already respelled)
  - `transcribe(samples: Float32Array): Promise<string>`
  - `speedTest(voice: string, speed: number): Promise<{ ok: boolean, rtf: number, firstMs: number }>` with `ok` when `rtf < 1.0 && firstMs < 2000` (constants `MAX_RTF`, `MAX_FIRST_MS` exported; the 2-second first-sentence ceiling is a plan decision, review it)
  - `stop(): void` (cancels the current speech), `shutdown(): void`, `isLoaded(): boolean`
- `WorkerChannel`: `{ postMessage(msg), on('message', fn), on('exit', fn), kill() }`. Messages in: `{ id, type: 'tts', text, voice, speed }`, `{ id, type: 'stt', samples }`, `{ type: 'cancel', id }`. Out: `{ id, type: 'audio', pcm, rate }`, `{ id, type: 'text', text }`, `{ id, type: 'error', message }`.
- `engine.js` exports `createEngine(packDir: string): Promise<{ tts(text, voice, speed): Promise<{ pcm: Float32Array, rate: number }>, stt(samples: Float32Array): Promise<string> }>`; `worker.js` is the `utilityProcess` entry that loads the engine from the pack path it is given and answers the messages above.

- [ ] **Step 1: Write failing tests** with an in-memory fake channel: speaking three sentences yields chunks with `index` 0,1,2 and `last` true only on the final one; `stop()` after the first chunk sends `cancel` and no further `onAudio` calls fire; a worker `error` rejects the pending promise with a plain message; with fake timers, after `idleMs` with no use `kill()` is called and `isLoaded()` is false, and the next `speak` spawns again; `speedTest` returns `ok:false` for a fake worker that is slower than real time and `ok:true` for a fast one; `shutdown()` kills the worker and rejects pending work.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement `host.js`** (spawn lazily on first request, one request id counter, idle timer reset on every request). Implement `worker.js` and `engine.js` with kokoro-js (`dtype: 'fp32'`, local model path under `packDir`) and a transformers.js `automatic-speech-recognition` pipeline for `Xenova/whisper-base.en` loaded from `packDir`, `local_files_only: true` so the worker can never touch the network.
- [ ] **Step 4: Run tests.** Expected: PASS. (Engine files are not covered here.)
- [ ] **Step 5: Windows check (Rohit, after Task 11):** `node tools/voice-smoke.js` prints real-time factor and first-sentence time for each of the six voices, and a transcript of a 5-second `test/fixtures/hello.wav` (Rohit records it). Expected: all six `ok:true` on the dev PC.
- [ ] **Step 6: Commit** `feat(voice): utility process host, worker and engines`.

### Task 7: Speaking in the play window

**Files:**
- Create: `src/voice/index.js`, `src/voice-player.js`
- Modify: `src/main.js` (IPC), `src/play-preload.js`, `src/play.html`, `src/play.js`, `src/i18n.js`
- Test: `test/voice-index.test.js`, `test/voice-player.test.js`

**Interfaces:**
- Consumes: `createHost` (Task 6), `text.js` (Task 1), `voices.js` (Task 3).
- Produces: `src/voice/index.js` exports `createVoice({ getState, packDir, spawn, sendToPlay: (channel: string, payload) => void }): { speak(lines: string[]): Promise<void>, stop(): void, available(): boolean, shutdown(): void }`. `speak` drops everything unless `getState().voice.on && lang === 'en'`, respells each line, splits to sentences, calls `host.speak` with the voice's `kokoro` id (not the short id) and `speedFor(voice, pace)`, and forwards chunks as `sendToPlay('voice-audio', chunk)`; `stop()` also sends `'voice-stopped'`.
- Preload (`window.play.voice`): `speak(lines: string[])`, `stop()`, `onAudio(fn)`, `onStopped(fn)`, `onError(fn)`. IPC: `voice-speak`, `voice-stop` (renderer → main), `voice-audio`, `voice-stopped`, `voice-error` (main → renderer).
- `voice-player.js` (`window.VoicePlayer`): `enqueue(chunk): void`, `stop(): void`, `isPlaying(): boolean`, using one `AudioContext` and `AudioBufferSourceNode`s scheduled back to back.

- [ ] **Step 1: Write failing tests.** `voice-index`: with `voice.on` false, `speak(['Hi.'])` never calls the fake host; with `lang` Hindi the same; with voice on, `'Mochi says hi.'` reaches the host as `'Mo-chee says hi.'`; calling `speak` again stops the previous speech first; `shutdown` kills the host. Add the **load test**: `require('../src/voice/index.js')` does not `require` `host.js`, `worker.js` or `engine.js` until the first `speak` with voice on (assert `require.cache` keys), and `engine.js` is never loaded in the main process. `voice-player`: with a fake `AudioContext`, `enqueue` of three chunks schedules back-to-back start times; `stop()` clears the queue and stops the active node.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the facade and player; add IPC handlers in `main.js` that create the voice facade only when `state.voice.on` first becomes true (lazy `require('./voice')`); add a 🔊 speaker button next to `#sound` in `play.html` that calls `play.voice.stop()` while playing; in `play.js` `showReply(r)` call `window.play.voice.speak(window.VoiceText.replyLines(r))` as the last line, after the reply is on screen; call `stop()` when the next worry is fed, on the `closed` path of the play window (`playWin.on('closed')` in `main.js`) and when voice is switched off. Add English strings (`speaker` tooltip, `voiceDeclined`) to `i18n.js`; Hindi and Hinglish menu strings fall back to English because voice is English only.
- [ ] **Step 4: Run tests.** Expected: PASS; `npm test` PASS.
- [ ] **Step 5: Commit** `feat(voice): speak replies in the play window`.

### Task 8: Push-to-talk

**Files:**
- Create: `src/recorder.html`, `src/recorder.js`, `src/recorder-worklet.js`, `src/recorder-preload.js`, `src/voice/hold.js`
- Modify: `src/main.js`, `src/play-preload.js`, `src/play.html`, `src/play.js`, `src/i18n.js`
- Test: `test/voice-hold.test.js`, `test/voice-resample.test.js`

**Interfaces:**
- Consumes: `createPolicy` (Task 4), `Calls.setPaused` (Task 5), `host.transcribe` and `fixTranscript` (Tasks 6, 1).
- Produces: `createHold({ now = Date.now, setTimer, onStart(): void, onStop(): void, maxMs = 30000 }): { start(): boolean, stop(): void, active(): boolean }`. `start()` returns `false` if a hold is already active; `stop()` is idempotent; the max-hold timer calls `stop()`.
- Produces: `resampleTo16kMono(input: Float32Array[], inRate: number): Float32Array` in `src/recorder-worklet.js` (UMD, testable).
- IPC: `voice-hold` (renderer → main, `boolean`), `voice-transcript` (main → renderer, `string`), `voice-error` with code `'no-mic' | 'denied' | 'busy' | 'failed'`.

- [ ] **Step 1: Write failing tests.** `hold`: `start` calls `onStart` once and `active()` is true; a second `start` returns `false`; `stop` calls `onStop` once and is idempotent; at 30 s the timer stops it; `stop` after a crash path (`stop()` called twice, once from timer, once from release) calls `onStop` exactly once. `resample`: 48 kHz stereo tone input yields 16 kHz mono output of length `round(n * 16000 / 48000)` with the same dominant frequency; empty input returns an empty array.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement `hold.js` and the resampler.** In `main.js`: `voice-hold(true)` → ignore unless voice is on and pack ready; `hold.start()`; `onStart` creates (first time) the hidden recorder `BrowserWindow` (`show: false`, sandbox, context isolation, its own preload, `default-src 'self'` CSP in `recorder.html`), registers its `webContents.id` for the policy, calls `Calls.setPaused(true)`, sends `rec-start`; `onStop` sends `rec-stop`, calls `Calls.setPaused(false)`. `getUserMedia({ audio: true })` is called only on `rec-start`; tracks are stopped on `rec-stop`. On `rec-stop` the recorder returns the samples; main passes them to `host.transcribe`, applies `fixTranscript`, sends `voice-transcript`, discards the samples. Clear the hold on: play window `closed`, recorder `closed` or `render-process-gone`, voice switched off, `before-quit`.
- [ ] **Step 4: Renderer.** Add a 🎤 button in `play.html` inside `#worry` (hidden unless voice is on and the pack is ready): `pointerdown` → `play.voice.hold(true)`, `pointerup`/`pointerleave`/`blur` → `play.voice.hold(false)`. A transcript is written into `#worry-text` (respecting `maxlength` 280) and focused; nothing is sent. An empty transcript or a hold under 300 ms changes nothing. `voice-error` shows the plain message from `i18n.js` (`micBlocked`, `micMissing`, `micBusy`).
- [ ] **Step 5: Run tests.** Expected: PASS; `npm test` PASS.
- [ ] **Step 6: Windows check (Rohit):** hold for a worry, release, text appears and is editable; switching Windows microphone privacy off shows the plain message; the taskbar microphone icon vanishes within a second of release; silent mode does not trigger from Mochi's own hold, but does trigger for a Teams call.
- [ ] **Step 7: Commit** `feat(voice): push-to-talk with hidden recorder window`.

### Task 9: Settings, speed test and pack flow

**Files:**
- Modify: `src/main.js` (new `voiceItem(M)` used inside the Settings submenu next to `aiItem`), `src/i18n.js`
- Test: `test/voice-menu.test.js` (pure helper `voiceMenuModel(state, packStatus): object` in `src/voice/index.js`)

**Interfaces:**
- Produces: `voiceMenuModel(state, packStatus): { enabled: boolean, canEnable: boolean, voices: [{ id, label, checked }], pace: 'default'|'slower', packAction: 'download' | 'remove' | 'downloading' }`.

- [ ] **Step 1: Write failing tests:** with `voice.on` false and pack `'missing'`, `packAction` is `'download'` and `canEnable` is false; pack `'ready'` gives `'remove'` and `canEnable` true; the two voices follow `state.petGender` and the checked one is `state.voice.voice` (default `defaultVoice(gender)` when null); gender `null` yields no voices.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the Voice submenu per spec section 9: on/off checkbox (off by default), voice radios (two, with a "Hear it" preview item that speaks one fixed line), pace radios, "Download voice pack (about 600 MB)" or "Remove voice pack", "Test voice speed". Download: show a `dialog.showMessageBox` consent that states the size and that this is the only network use; on Yes run `Pack.download` from the main process, update the menu label with percent via `refreshTrayMenu()` (throttled like `aiChanged`), on failure show the plain message mapped from `reason`. Turning voice on the first time runs `host.speedTest`; if `ok` is false voice stays off with the plain message. "Remove voice pack" calls `shutdown()`, `Pack.remove`, sets `voice.on = false`. Switching voice off calls `shutdown()` and drops the facade. The size text comes from the manifest `totalBytes`, not a constant.
- [ ] **Step 4: Run tests.** Expected: PASS; `npm test` PASS.
- [ ] **Step 5: Commit** `feat(voice): settings submenu, speed test, pack consent and removal`.

### Task 10: Safety, privacy and idle checks

**Files:**
- Test: `test/voice-safety.test.js` (create)
- Modify: nothing unless a test fails

- [ ] **Step 1: Write the tests:** (a) crisis and hopeless replies: for each of `WorryEater.respond('i want to end it all', ...)` and a heavy-wording input, `replyLines(r)` contains each helpline entry verbatim and `respell` leaves helpline numbers unchanged; (b) with `state.voice.on` false and `Calls` / permissions / `index.js` required fresh, no `host.js`, `worker.js`, `engine.js`, or `recorder` module is in `require.cache` and no `BrowserWindow` for the recorder is created (inject a fake factory); (c) the permission policy denies everything when voice is off.
- [ ] **Step 2: Run** `npm test`. Expected: PASS (fix whatever fails in the owning task's files, not by weakening the test).
- [ ] **Step 3: Commit** `test(voice): safety, off-means-off, helpline verbatim`.

### Task 11: Packaging, pack builder, licences

**Files:**
- Create: `tools/make-voice-pack.js`, `tools/voice-smoke.js`, `specs/voice-licences.md`
- Modify: `package.json` (`dependencies`: `kokoro-js`, `@huggingface/transformers`, `onnxruntime-node`; `build.files` excludes `sharp` and the pack; `asarUnpack` adds `node_modules/onnxruntime-node/bin/**`), Store manifest (microphone capability), `src/voice/pack-manifest.json`
- Test: `test/package-voice.test.js`

- [ ] **Step 1: Write the failing test:** read `package.json` and assert `asarUnpack` includes the onnxruntime path, `build.files` contains the `sharp` exclusion, and `models/` plus the voice pack are not in `extraResources`; assert `pack-manifest.json` has six-voice file entries once filled (this assertion is skipped while any `sha256` starts with `TBD`).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Edit `package.json`. `tools/make-voice-pack.js` (run by Rohit on the PC): downloads Kokoro fp32, the voices, and Whisper base.en into a temp folder, writes `voice-pack-<version>/` plus `pack-manifest.json` with real byte sizes and SHA-256, prints the total size. Declare the microphone capability in the AppX manifest: check electron-builder's AppX documentation for the supported key (likely a custom manifest template under `build/appx`) and make the smallest change; do not touch the Mac entitlements. `specs/voice-licences.md`: list each dependency and licence; the phonemizer / espeak-ng row stays `UNCONFIRMED` until the check below.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Windows checks (Rohit):** `npm install`; `Select-String -Path node_modules\phonemizer\README.md -Pattern "espeak|licen"` and paste the output; if GPL, the engine plan changes (stop and re-plan Task 6); run `node tools/make-voice-pack.js`, upload the folder as a GitHub release asset in the public repo, paste the real manifest; `npm run dist:store`, open the produced manifest and confirm the microphone capability is present.
- [ ] **Step 6: Commit** `build(voice): dependencies, pack builder, licence list`.

### Task 12: Docs, store text, and test pass

**Files:**
- Modify: `PRIVACY.md`, `docs/privacy.html`, `docs/faq.html`, `docs/features.html`, `docs/changelog.html` (merge to `main` only with the 0.13.0 release; `docs/` is the live site), Store listing text (a file in `specs/` for Rohit to paste)
- Create: `specs/voice-windows-test-pass.md`

- [ ] **Step 1:** Add to each page: voice is optional and off by default; audio is processed on this device, never saved or sent; the only network use is the one-time pack download. Keep the existing tone and the page's existing structure.
- [ ] **Step 2:** `specs/voice-windows-test-pass.md` is the spec section 12 integration list as a checklist with a pass/fail column: speed on an older laptop; microphone accuracy with base.en vs small.en; install, uninstall and "Remove voice pack"; Store certification of the microphone capability; silent mode during a hold; zero CPU and memory with voice off; the six voices heard once each; Hindi reply is silent.
- [ ] **Step 3: Run** `npm test`. Expected: all PASS.
- [ ] **Step 4: Commit** `docs(voice): privacy, FAQ, store text, Windows test pass`.

---

## Open items carried from the spec (do not block starting)

1. One-word feel labels per voice (Task 3 `label`).
2. espeak-ng licence check (Task 11, Step 5).
3. Older-laptop speed test and `base.en` vs `small.en` (Tasks 6 and 8 checks).
4. Pack hosting: GitHub release asset in the public repo (Task 11).
5. Plan decisions to confirm: Windows-only voice; `slower` = 0.9 × voice pace; first-sentence ceiling 2 seconds; Kokoro ids `bm_fable` and `af_alloy` (verify against kokoro-js `list_voices()` on the PC).
