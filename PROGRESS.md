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

It does not ship until it beats the model already in the app on the frozen test set. That test, the scores and the architecture notes are in the private `mochi_slm` repo (`docs/specs/2026-11-10-puff-from-scratch.md`). They are not copied here.
The test set for the ship gate is frozen at 300 items in the private `mochi_slm` repo. It is not stored here, and it must not be used as training data.
Layer 1 of the frozen test (shape and safety only) was run on the prototype. It is not a ship result. The model already in the app has not been scored on that set yet. The numbers stay in the private repo.
The model already in the app was scored on the same frozen set, layer 1 only (shape and safety). It is not a ship result. The comparison stays in the private repo.
