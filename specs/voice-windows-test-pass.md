# Voice input 0.13.0: Windows test pass (Rohit, on the PC)

Mochi listens (push-to-talk). It does not speak. This replaces the earlier 17-check list that included spoken replies.

Setup first: `git pull --rebase`, then `npm install` (this removes the speaking packages and rewrites `package-lock.json`; commit both `package.json` and `package-lock.json`), then `npm test`, then `npm start`.
The speech pack needs no rebuild or re-upload: its 12 Whisper files are already in GitHub release `voice-pack-1` with the same fingerprints.

| # | Check | Pass? |
|---|---|---|
| 1 | `npm ls phonemizer kokoro-js cmu-pronouncing-dictionary` prints `(empty)`; `Test-Path node_modules\phonemizer` prints `False`. This is the GPL release blocker: it must pass. | |
| 2 | `node tools/voice-smoke.js <packDir> hello.wav`: transcript is right; the second run is faster than the audio is long. | |
| 3 | App starts with voice input off: no extra process in Task Manager, CPU idle. | |
| 4 | Settings > Voice input: the consent says "about 295 MB"; download finishes; unplug the network mid-download, retry resumes. | |
| 5 | Tick "Talk instead of typing": the mic button appears in Feed me a worry. Untick: it disappears. | |
| 6 | An older install that already has the big pack: on first start the old Kokoro folder (`models\onnx-community`) is deleted and voice input still works. | |
| 7 | Nothing in Mochi speaks aloud (no sound from a reply, no speaker button). | |
| 8 | Hold the mic button: text appears, editable, never auto-sent. Taskbar mic icon disappears on release. | |
| 9 | Tap (under half a second) and silence: nothing happens, no error. | |
| 10 | Windows Settings > Privacy > Microphone off: plain message, typing still works. | |
| 11 | Silent mode: not triggered by Mochi's own hold; still triggered by a real Teams/Zoom call. | |
| 12 | Say each buddy's name ("hey Cinder", "hey Mochi") with each buddy: the name is written correctly. | |
| 13 | A Hindi or Hinglish worry typed in: reply works as before (text only). | |
| 14 | Compare Whisper base.en vs small.en with real speech; pick one. | |
| 15 | "Remove speech pack": folder deleted, voice input off. | |
| 16 | `npm run dist:store`: open the manifest, microphone capability present. If the packaged app fails to start voice input with a missing `sharp` error, ship a stub `sharp` package (transformers.js may import it at load). | |
| 17 | Idle with voice input on for 11 minutes: the voice process exits (Task Manager). | |

At release (not before): add the changelog and features entries, then merge the docs changes together with the 0.13.0 version bump.
