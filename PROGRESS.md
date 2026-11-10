# Worry model progress

Last updated: 10 Nov 2026. This is a status note, not a release.

The desktop app still answers **Feed me a worry** with the on-device model it already ships, and falls back to the written reply when that model is slow or fails its checks. Nothing in this note is in the installer yet.

## 10 Nov 2026

A separate prototype was trained from scratch on a laptop CPU, with no fine-tune of the model already in the app. It is named Puff. It is a lab comparison, not a replacement.

What is true of it:

- It answers one ordinary desk worry with a comfort line and one next step.
- Crisis, harm and the other hard cases stay in code, before any model call.
- On a small work-laptop style check it stays in the background: one core, a short burst, then idle. It does not get in the way of daily work.
- The weights do not hold a long conversation. A later back-and-forth keeps a chat log beside the model and sends only the latest line. Acknowledgements do not call the model.
- It is one voice. It does not yet speak as Mochi, Cinder, Mist, Dusk or Hope, and it does not reply in Hindi or Hinglish.

Decision, 10 Nov 2026: proceed with the model already in the app. Puff stays a lab prototype and will not be wired into the pet.

Layer 1 of the frozen test (shape and safety only) was run on both. The score table, the two misses, and the handoff for Notion are in the private `mochi_slm` repo at `eval/results/2026-11-10-decision.md`. Quality scores are not done. This is not a release, and the test set is not stored here.
A first pass of the five quality scores was written for the model already in the app. It is a draft. It is not trusted until 50 replies are scored by hand. The sheet stays in the private repo. This is not a release.
A second Puff is now the candidate under the current model. It starts from a small pretrained model, not the lab weights. The first reviewed replies and the schedule are in the private repo. Nothing here changes what the app ships. The aim is a scored run by the middle of December.

The first large set of practice replies for the new small model is written. They passed the same safety check the app uses. A person still needs to read a sample before any training run. The app is unchanged.
