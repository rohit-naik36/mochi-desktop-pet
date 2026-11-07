# Voice: licences (for the repo and the About screen)

| Component | Used for | Licence | Status |
|---|---|---|---|
| Kokoro-82M weights (onnx-community build) | speaking | Apache-2.0 | per spec |
| kokoro-js | speaking | Apache-2.0 | per spec |
| @huggingface/transformers (transformers.js) | listening | Apache-2.0 | per spec |
| onnxruntime-node (via transformers.js) | running both models | MIT | per spec |
| Whisper base.en weights (Xenova ONNX build) | listening | MIT | confirm from the model card when the pack is built |
| phonemizer (bundles espeak-ng data) | text to sounds | espeak-ng is **believed GPL-3, UNCONFIRMED** | **BLOCKER for shipping the pack.** Check on the PC: `Select-String -Path node_modules\phonemizer\README.md -Pattern "espeak|licen"`. If GPL: replace the text-to-sound step with a permissive one, or ship another engine, and re-plan Task 6. |
| sharp (LGPL, optional dep of transformers.js) | not used | LGPL | left out of the packaged app (`!node_modules/sharp/**`, `!node_modules/@img/**`) |

Also on the lawyer review list: Anthropic terms on training with Claude outputs (SLM work, not voice).
