# Roadmap

Owned by the CPO. The CEO approves anything entering Now or Next.
Set at the 18 Nov 2026 leadership offsite. It replaces the earlier version.

## Now (0.13.0: freeze 11 Dec, release 18 Dec)
1. **A review gate you can trust.** Router fixes, the pause bypass closed, and agent PRs reviewed and merged with no human step.
2. **macOS first.** Signed and notarized build, mic permission for voice in, and a built-in updater for Mac (checks at most once a day, off switch in Settings, installs signed builds only, privacy page updated first, never in Store builds).
3. **Website update.** Honest Mac status (including "right-click = Control + click or a two-finger click"), Hope is live, the Store link, and the approved "coming soon" hints.
4. **English only.** Remove Hindi and Hinglish from the app and the website; anyone who chose them falls back to English without errors.
5. **Voice in** (push-to-talk speech to text) on Windows, if ready by the freeze; otherwise 0.13.1.
6. **Festive pack.** A festive accessory for every buddy, festive lines and New Year confetti, from about 20 Dec to 2 Jan, using the local date only, with an off switch. The website switches to a festive look on the same dates. In 0.13.0 if ready by the freeze; otherwise 0.13.1 by 22 Dec.
7. **Security.** Dependency updates (Electron 44.9.1, simple-git 4).

If something has to give at the freeze, keep them in this order: the Mac build, the Mac updater, voice in, then the festive pack.

## Next
- Mochi for Teams: pilot-ready build after the CEO's pre-launch checks (target end of January 2027). Discovery conversations only until then.
- Worry memory: one design, on-device, opt-in. After 0.13.
- Check-ins at the start and end of the day and week.
- Windows code signing, then an updater for direct Windows downloads (the Store already updates itself).

## Later
- Voice out (Mochi speaks): comes back after a licence review.
- Mochi-specific small model: a lab track in the private repo. It joins the roadmap only by CEO decision.
- More languages, once English is solid.
- Mochi Pulse scale features.
- Public rename (Kemu): on hold.

## Not before 31 January 2027
Calendar link, quarterly model refresh, new social accounts, paid ads.

## Working rules
- Work in progress: one milestone in build and one in prep; at most 5 `status:ready` issues per role; at most 3 open exec tasks.
- Release train: weekly, on Thursday, from 0.13.0.
