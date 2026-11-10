# Voice input: licences (for the repo and the About screen)

Mochi listens (push-to-talk speech to text). It does not speak. Spoken replies were removed on 10 Nov 2026
(robotic result; also removed the only GPL risk). Everything below is what ships.

| Component | Used for | Licence | Status |
|---|---|---|---|
| @huggingface/transformers (transformers.js) | running the listening model | Apache-2.0 | per spec |
| onnxruntime-node (via transformers.js) | running the listening model | MIT | per spec |
| Whisper base.en weights (Xenova ONNX build) | listening | MIT | confirm from the model card and show the credit on the About screen |
| sharp (LGPL, optional dep of transformers.js) | not used | LGPL | left out of the packaged app (`!node_modules/sharp/**`, `!node_modules/@img/**`) |

## Removed on 10 Nov 2026 (no longer shipped, no notice needed)

| Component | Why it was there | Note |
|---|---|---|
| Kokoro-82M weights, kokoro-js | speaking | Apache-2.0; gone with spoken replies |
| phonemizer npm package (embeds eSpeak NG) | text to sounds | **GPL-3.0-or-later inside an Apache-labelled wrapper. Was a release blocker.** It came in through kokoro-js, so removing kokoro-js removes it. After `npm install`, confirm with `npm ls phonemizer` (expect "empty") and that `node_modules/phonemizer` is gone. |
| cmu-pronouncing-dictionary, CMUdict data | home-made phonemizer | no longer used, so the CMU notice file (`NOTICE-cmudict.txt`) was removed too |
| Blended character voices | per-character voices | gone with spoken replies |

The Kokoro files are still attached to the `voice-pack-1` GitHub release but nothing downloads them any more.
They can be deleted from the release whenever convenient. Older installs delete the retired model from the user's
voice-pack folder on the next start (`removeLegacy` in `src/voice/pack.js`).

Also on the lawyer review list: Anthropic terms on training with Claude outputs (SLM work, not voice).
