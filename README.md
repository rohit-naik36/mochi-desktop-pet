# Mochi, a desktop pet

A small, cute puff of black smoke with glowing white eyes that lives at the bottom of your screen while you work.
It drifts around, naps, reacts when you pet it, gets hungry, and nudges you to
drink water, stretch, and rest your eyes.

## Install (Windows)

- **Mochi Setup 0.1.0.exe**: one-click installer. Adds Start menu and desktop shortcuts and launches Mochi.
- **Mochi-Portable-0.1.0.exe**: no install, just double-click to run.

Until the app is signed, Windows SmartScreen says "Windows protected your PC".
Click **More info → Run anyway**. See *Getting rid of the SmartScreen warning* below.

## Play room

Right-click → **Play** turns your desktop into a play area. Your buddy stays where it is and the games happen around it. Every game makes your buddy happier. Press Esc or ✕ to go back to work, and your buddy stays wherever play left it.
- **Breathe with me**: your buddy swells as you breathe in and shrinks as you breathe out (4s in, 4s hold, 6s out, 6 rounds).
- **Bubble pop**: soft bubbles float up across your whole screen. Pop them with gentle sounds. No timer, no score pressure.
- **Chase the light**: a warm light follows your mouse and your buddy floats after it.
- **Feed it a worry**: type what's bothering you and your buddy eats it, letter by letter. It reflects back what you wrote, offers comfort that fits the topic (deadlines, work, study, money, people, health, self-doubt, the future), and suggests one tiny next step. If a worry mentions self-harm, it gently points to people who can help. It runs fully offline and nothing is saved.

Your buddy also sometimes asks if you want a quick play break. The 🔊 button turns sounds off.

## Your name

On first launch Mochi asks what to call you and uses your name in greetings, reminders and replies.
Change it any time: right-click → **Change my name**.

## If someone is struggling

If a worry mentions suicide or self-harm, Mochi responds with care and shows free Indian helplines:
Tele-MANAS **14416**, KIRAN **1800-599-0019**, Vandrevala Foundation **+91 9999 666 555**, and emergency **112**.

## Pick your buddy

Right-click the pet and open **Choose your buddy**:
- **Mochi**: black smoke, glowing white eyes
- **Cinder**: charcoal smoke, ember eyes, drifting sparks
- **Mist**: silver fog, dark eyes (easiest to see on dark wallpapers)
- **Dusk**: indigo smoke with twinkling stars

## How to play

| Do this | Mochi does |
|---|---|
| Click | Gets petted, hearts, sometimes says something kind |
| Double-click | Eats a snack |
| Drag | Carry it anywhere on screen; it stays where you drop it |
| Right-click, or the tray icon | Menu: choose your buddy, feed, play, nap, wander on/off, reminders, start with Windows, quit |

Reminders (each can be turned off from the menu):
- Drink water every 45 min
- Stretch break every 60 min (Mochi stretches with you)
- 20-20-20 eye rest every 20 min

Click **Done!** on a reminder and Mochi cheers you on. Ignore a reminder for 3 minutes and Mochi floats to the middle of your screen and puffs up, upset, until you click Done (or snooze it). Ignore it too long and it gets hungry and a bit sad.
Stats are saved in `%APPDATA%\Mochi\pet-state.json`, so Mochi remembers you between restarts.

## Develop

```
npm install
npm start            # run it
npm run dist:win     # build installer + portable exe into dist/
npm run dist:mac     # on a Mac
```

Code: `src/main.js` (window, tray, movement), `src/pet.html|css|js` (the pet, its moods, reminders).

## Getting rid of the SmartScreen warning

`.github/workflows/build-windows.yml` builds on a real Windows machine. Push a tag (`git tag v0.1.1 && git push --tags`)
and it publishes the installer to GitHub Releases. Two ways to make the warning go away:

1. **Microsoft Store (free for individuals).** Register at partner.microsoft.com, reserve the name "Mochi",
   then add the three values from *Product identity* as repo secrets: `STORE_IDENTITY_NAME`, `STORE_PUBLISHER`,
   `STORE_PUBLISHER_NAME`. The workflow then also builds a `.appx`. Upload that to Partner Center. Microsoft
   signs Store apps, so there is no warning when people install from the Store.
2. **Azure Artifact Signing (about $10/month).** Signs the regular installer. After identity validation, add the repo
   secrets `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_SIGN_ENDPOINT`,
   `AZURE_SIGN_ACCOUNT`, `AZURE_SIGN_PROFILE`, `AZURE_SIGN_PUBLISHER`. Builds are signed from then on.
