# Voice 0.13.0: Windows test pass (Rohit, on the PC)

Setup first: `npm install` (commit the updated package-lock.json), `node tools/make-voice-pack.js <folder>`, upload `<folder>\assets` to GitHub release `voice-pack-1`, run `npm test`, `npm start`.

| # | Check | Pass? |
|---|---|---|
| 1 | `Select-String -Path node_modules\phonemizer\README.md -Pattern "espeak|licen"`: paste output. If GPL, STOP and re-plan Task 6 (engine). | |
| 2 | `node tools/voice-smoke.js <packDir> hello.wav`: all six voices say OK; transcript is right. | |
| 3 | App starts with voice off: no extra process in Task Manager, CPU idle. | |
| 4 | Settings > Voice: voice pack consent shows the size; download finishes; unplug network mid-download, retry resumes. | |
| 5 | Turn voice on: speed test passes. Repeat on an older laptop: passes or declines politely. | |
| 6 | Feed me a worry: reply is spoken; speaker button stops it; new worry stops it; closing the window stops it. | |
| 7 | All six voices heard once (Hear this voice). Send me the one-word feel labels. | |
| 8 | Hold the mic button: text appears, editable, never auto-sent. Taskbar mic icon disappears on release. | |
| 9 | Tap (under half a second) and silence: nothing happens, no error. | |
| 10 | Windows Settings > Privacy > Microphone off: plain message, typing still works. | |
| 11 | Silent mode: not triggered by Mochi's own hold; still triggered by a real Teams/Zoom call. | |
| 12 | A crisis worry: helplines are read out exactly as shown. | |
| 13 | A Hindi or Hinglish worry: reply is silent. | |
| 14 | Compare Whisper base.en vs small.en with real speech; pick one. | |
| 15 | "Remove voice pack": folder deleted, voice off. | |
| 16 | `npm run dist:store`: open the manifest, microphone capability present. If the packaged app fails to start voice with a missing `sharp` error, ship a stub `sharp` package (transformers.js may import it at load). | |
| 17 | Idle with voice on for 11 minutes: the voice process exits (Task Manager). | |

At release (not before): add the changelog and features entries, then merge the docs changes together with the 0.13.0 version bump.
