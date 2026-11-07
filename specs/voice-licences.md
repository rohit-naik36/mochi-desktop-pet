# Voice: licences (for the repo and the About screen)

| Component | Used for | Licence | Status |
|---|---|---|---|
| Kokoro-82M weights (onnx-community build) | speaking | Apache-2.0 | per spec |
| kokoro-js | speaking | Apache-2.0 | per spec |
| @huggingface/transformers (transformers.js) | listening | Apache-2.0 | per spec |
| onnxruntime-node (via transformers.js) | running both models | MIT | per spec |
| Whisper base.en weights (Xenova ONNX build) | listening | MIT | confirm from the model card when the pack is built |
| phonemizer npm package (embeds eSpeak NG as WebAssembly) | text to sounds | wrapper labelled Apache-2.0; the embedded eSpeak NG engine is GPL-3.0-or-later | **BLOCKER, being replaced.** Checked 7 Nov 2026 on the PC: `dist/phonemizer.js` is 1.3 MB with no separate wasm, README names eSpeak NG, no GPL notice anywhere in the package. Do not ship. Replaced by `src/voice/phonemes.js` (listening spike passed, see below). The package must be out of the packaged app before release. |
| cmu-pronouncing-dictionary 3.0.0 (npm wrapper) | word pronunciations for `src/voice/phonemes.js` | ISC (Zeke Sikelianos, 2015) | confirmed from the package's licence file, 7 Nov 2026 |
| CMUdict pronunciation data (Carnegie Mellon University) | the data inside that package | BSD-style, Copyright (C) 1993-2015 Carnegie Mellon University | permits commercial use; **the notice must travel with the app**. The npm wrapper does not include it. Put CMU's licence text in `NOTICE-cmudict.txt` and show it on the About screen. |
| Blended character voices (averages of Kokoro voice files, made on the device) | per-character voices | derived from the Apache-2.0 Kokoro voices | no new files in the pack; the blend is computed at run time from voices already in it. Mention in the About screen with the Kokoro credit. |
| sharp (LGPL, optional dep of transformers.js) | not used | LGPL | left out of the packaged app (`!node_modules/sharp/**`, `!node_modules/@img/**`) |

Also on the lawyer review list: Anthropic terms on training with Claude outputs (SLM work, not voice).
