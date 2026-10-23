# Mochi, a desktop pet

A small, cute puff of black smoke with glowing white eyes that lives at the bottom of your screen while you work.
It drifts around, naps, reacts when you pet it, gets hungry, and nudges you to
drink water, stretch, and rest your eyes.

## Install (Windows)

- **Mochi Setup 0.1.0.exe**: one-click installer. Adds Start menu and desktop shortcuts and launches Mochi.
- **Mochi-Portable-0.1.0.exe**: no install, just double-click to run.

The build is not code-signed yet, so Windows SmartScreen will say "Windows protected your PC".
Click **More info → Run anyway**. (Fix for real users: buy a code-signing certificate.)

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
| Drag | Gets carried, then lands on the taskbar |
| Right-click, or the tray icon | Menu: choose your buddy, feed, play, nap, wander on/off, reminders, start with Windows, quit |

Reminders (each can be turned off from the menu):
- Drink water every 45 min
- Stretch break every 60 min (Mochi stretches with you)
- 20-20-20 eye rest every 20 min

Click **Done!** on a reminder and Mochi gets happier. Ignore it too long and it gets hungry and a bit sad.
Stats are saved in `%APPDATA%\Mochi\pet-state.json`, so Mochi remembers you between restarts.

## Develop

```
npm install
npm start            # run it
npm run dist:win     # build installer + portable exe into dist/
npm run dist:mac     # on a Mac
```

Code: `src/main.js` (window, tray, movement), `src/pet.html|css|js` (the pet, its moods, reminders).
