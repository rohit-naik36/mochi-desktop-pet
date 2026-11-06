# Mochi voice: design spec (v0.13.0)

Date: 2026-11-06. Status: DRAFT, design approved by the founder in chat on 6 Nov; this written spec is awaiting review.
Owner: Rohit Naik (Unorthologic LLP / Little Smoke Studio).

## 1. What and why

Mochi can speak its replies aloud and listen to a worry spoken aloud, on the user's own PC, with nothing sent anywhere.
It is optional and off by default. English only. Hindi and Hinglish stay on text.

Success looks like:
- A user turns voice on, downloads the voice pack once, holds a button, speaks a worry, and hears Mochi's reply in a soothing voice.
- Mochi's replies never get slower or less safe because voice exists.
- Nothing about voice is on for anyone who did not choose it. No audio is stored. No network use except the one-time pack download.

## 2. Scope

In: speaking replies (text to speech), push-to-talk listening (speech to text) in the "Feed me a worry" window, Settings controls, voice pack download, Store/privacy updates.
Out: Hindi/Hinglish voice, free-form hands-free conversation, wake words, global hotkeys, voice cloning, recording or storing audio, cloud speech services.

## 3. Architecture

- **Voice runs in its own background process** (a Node utility process started by the main process). It loads the models, takes text and returns audio, or takes audio and returns text. The windows never load model code, so the existing sandbox, context isolation and `default-src 'self'` policy stay unchanged.
- **Models load on first use and unload after about 10 minutes idle**, like the reply model.
- **Engines (decided by listening tests, 6 Nov):**
  - Speaking: Kokoro-82M (Apache-2.0) through kokoro-js, fp32 weights (about 3x faster than q8 on CPU and sounded better).
  - Listening: Whisper base.en (via transformers.js, ONNX runtime). Small.en to be tested for accuracy against its extra size.
- **Pace:** speaking is sentence by sentence. Sentence 1 is synthesised and played while sentence 2 is prepared.

## 4. Speaking

1. The reply (written or model-made) is split into sentences.
2. Respelling before synthesis: "Mochi" becomes "Mo-chee"; a small pronunciation dictionary covers buddy names and other Mochi words. ("Moh chee" splits into "Mo Chi", so it is not used.)
3. Each sentence is synthesised and queued for playback. Stop on: new reply, window closed, voice turned off, or the user pressing the speaker button.
4. **Speed test:** when voice is first enabled, a 2-second test sentence is synthesised. If it runs slower than real time on this PC, voice is declined with a plain message and Mochi stays text-only. The test is repeated only when the user asks.
5. Voice never changes what Mochi says. It speaks exactly the text shown on screen.

## 5. The six voices (decided 6 Nov, by ear)

The Settings gender option (male / female / nonbinary) picks which two voices are offered. Pace is a per-voice setting.

| Buddy gender | Voice | Accent | Pace |
|---|---|---|---|
| Female | Heart | US | 0.90 |
| Female | Bella | US | 0.95 |
| Male | Puck | US | 0.90 |
| Male | Echo | US | 0.90 |
| Nonbinary | Fable | UK | 0.90 |
| Nonbinary | Alloy | US | 0.95 |

Spares held back: Isabella (UK, female), Fenrir (US, nonbinary). One-word "feel" labels for the picker are to be supplied by the founder.
Caveat: Kokoro's own quality grades for some male voices are lower (Puck C+, Echo D). The choice was made by the founder's ear. Re-check after any engine update.

## 6. Listening (push to talk)

- A microphone button in the Feed me a worry window. **Hold to talk, release to stop.** No global hotkey: release cannot be detected globally and hotkeys clash with other apps.
- Audio is captured by a **small hidden recorder window** that is the only window allowed microphone access, and only while the button is held. The main-process permission handler stays "deny everything" except for that one window, that one permission (audio capture), and only while a hold is active.
- Audio goes to the voice process in memory, is transcribed, then discarded. Nothing is written to disk.
- The transcript is placed in the text box. The user can edit it and then send it as an ordinary worry. Voice input never auto-sends.
- Max hold: 30 seconds.
- Whisper handling of "Mochi" and buddy names: a post-fix on the transcript for known near-misses.

## 7. Silent mode and the microphone

`src/calls.js` reads the Windows microphone consent registry to detect a call and hush Mochi. Mochi's own use would trigger that. Fix:
1. Ignore Mochi's own entry in the registry result.
2. Pause the check while a hold is active, as a second guard.
Both get tests (`deviceInUse` fixtures with and without Mochi's entry).

## 8. Voice pack

- Optional download of about 600 MB (Kokoro fp32 about 330 MB, voices, Whisper base.en about 290 MB, runtime data). A smaller listening model may bring this to about 400 MB. Figures are estimates until measured on a real install.
- A screen states the size and asks for consent before anything downloads.
- Downloaded **by the main process** from a GitHub release asset in the public repo. Pinned SHA-256; resumable; verified before use; stored under the user's app data folder. A failed or mismatched file is deleted and the user is told in plain words.
- "Remove voice pack" in Settings deletes it and turns voice off.
- The voice pack is not bundled in the installer, so the Store package stays small.

## 9. Settings

New **Voice** submenu: on/off (off by default), voice (two choices for the buddy's gender, with a preview), pace (slower / default), download or remove voice pack, "Test voice speed". Strings follow Mochi's existing menu style.

## 10. Safety

- Crisis and heavy-wording routing stays in code and runs **before** any reply, spoken or written. Voice sits after it.
- Voice speaks only text that already passed the existing checks. It adds no new reply content.
- Helpline wording is spoken exactly as written, never paraphrased.
- The reply remains a friend's, not a therapist's. No voice-specific persona claims.
- Voice off means no model load, no process, no microphone code path reachable.

## 11. Privacy, Store and licences

- **Privacy policy / FAQ / Store listing:** state that voice is optional; audio is processed on the device, never saved or sent; the one network use is the pack download.
- **Store manifest:** declare the microphone capability. Certification of that capability is verified only by a real submission.
- **Licences:** Kokoro weights and kokoro-js, transformers.js (Apache-2.0), onnxruntime (MIT). The phonemizer package bundles espeak-ng data, **believed to be GPL-3 but not yet confirmed**. Resolve before the pack ships: if GPL, replace the text-to-sound step with a permissively licensed one, or ship an alternative engine. `sharp` (LGPL) is left out of the packaged app. A final licence list goes in the repo and the About screen.

## 12. Testing

- Unit: sentence splitting, respelling, pronunciation dictionary, hash verification and resume logic, `deviceInUse` with Mochi's own entry, permission-handler allow/deny matrix.
- Integration (Windows, by the founder): speed on an older laptop, real microphone accuracy, install/uninstall with the pack, Store certification, silent mode during a hold, battery/CPU while idle (should be zero with voice off).
- A tiny CI check that the voice code is not loaded when voice is off.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Slow PCs make voice laggy | Speed test; text-only fallback; sentence streaming |
| 600 MB download deters users | Optional, consent screen, resume; test a smaller listening model |
| Microphone permission widens attack surface | One hidden window, one permission, only during a hold; sandbox unchanged |
| Silent mode misfires | Registry exclusion plus pause during hold; tests |
| espeak-ng licence | Resolve before shipping the pack |
| Whisper mishears worries | Transcript is editable, never auto-sent; test small.en |
| Store rejects the microphone capability | Privacy text first; test in a submission early |

## 14. Open items (founder)

1. One-word feel labels for the six voices.
2. Run the espeak-ng licence check on the PC (README/licence files in `node_modules\phonemizer`).
3. Test speed on an older laptop.
4. Choose Whisper base.en or small.en after a real microphone test.
5. Confirm the pack hosting: a GitHub release asset in the public repo.
