const petEl = document.getElementById('pet');
const fx = document.getElementById('fx');
const bubble = document.getElementById('bubble');
const bubbleText = document.getElementById('bubble-text');
const bubbleActions = document.getElementById('bubble-actions');

let S = null;              // persisted state from main
let mode = 'idle';         // idle | walk | sleep | happy | eat | stretch
let dir = 1;               // 1 = right, -1 = left
let vy = 0;                // vertical drift while wandering
let modeUntil = 0;
let dragging = null;
let bubbleTimer = null;
let bubbleSticky = false;
const timers = {};

const MIN = 60_000;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v) => Math.max(0, Math.min(100, v));
// The user's name, for friendlier lines. ", Rohit" / "" and "Rohit" / "friend".
const n = () => (S && S.userName ? ', ' + S.userName : '');
const you = () => (S && S.userName) || 'friend';

// ---------- rendering ----------

function setMode(m, ms) {
  mode = m;
  modeUntil = Date.now() + (ms ?? 0);
  petEl.className = m;
  if (dir < 0) petEl.classList.add('facing-left');
  if (S && S.happiness < 30 && m !== 'sleep') petEl.classList.add('sad');
}

function float(text, cls = '') {
  const el = document.createElement('div');
  el.className = 'float ' + cls;
  el.textContent = text;
  el.style.left = rand(30, 80) + 'px';
  el.style.top = rand(0, 30) + 'px';
  fx.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function say(text, { actions = [], ms = 6000, sticky = false, input = null } = {}) {
  clearTimeout(bubbleTimer);
  bubbleText.textContent = text;
  bubbleActions.innerHTML = '';
  bubble.querySelector('input')?.remove();
  if (input) {
    const field = document.createElement('input');
    field.placeholder = input.placeholder || '';
    field.maxLength = 30;
    field.value = input.value || '';
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && field.value.trim()) { hideBubble(true); input.onSubmit(field.value.trim()); }
      if (e.key === 'Escape') hideBubble(true);
    });
    bubbleText.after(field);
    window.pet.focus();
    setTimeout(() => field.focus(), 60);
    actions = [{ label: input.button || 'Save', primary: true, keepOpen: true, run: () => { if (field.value.trim()) { hideBubble(true); input.onSubmit(field.value.trim()); } else field.focus(); } }, ...actions];
  }
  for (const a of actions) {
    const b = document.createElement('button');
    b.textContent = a.label;
    if (a.primary) b.className = 'primary';
    b.onclick = (e) => { e.stopPropagation(); if (!a.keepOpen) hideBubble(true); a.run && a.run(); };
    bubbleActions.appendChild(b);
  }
  bubble.classList.remove('hidden');
  bubbleSticky = sticky;
  if (mode === 'idle') { petEl.classList.add('talk'); setTimeout(() => petEl.classList.remove('talk'), 900); }
  if (!sticky) bubbleTimer = setTimeout(() => hideBubble(), ms);
}

function hideBubble(force = false) {
  if (bubbleSticky && !force) return;
  bubbleSticky = false;
  bubble.classList.add('hidden');
}

// ---------- stats ----------

function change(delta) {
  for (const k of Object.keys(delta)) S[k] = clamp(S[k] + delta[k]);
  window.pet.save({ happiness: S.happiness, hunger: S.hunger, energy: S.energy });
}

function catchUpWhileAway() {
  const awayMin = Math.min((Date.now() - (S.lastSeen || Date.now())) / MIN, 12 * 60);
  if (awayMin > 1) {
    S.hunger = clamp(S.hunger + awayMin / 10);
    S.happiness = clamp(S.happiness - awayMin / 15);
    S.energy = clamp(S.energy + awayMin / 5);
  }
}

// Every minute: get a little hungrier, a little lonelier.
function minuteTick() {
  const sleeping = mode === 'sleep';
  change({
    hunger: 1 / 6,
    happiness: S.hunger > 70 ? -0.6 : -0.2,
    energy: sleeping ? 4 : -0.3,
  });
  if (S.hunger > 75 && !bubbleSticky && Math.random() < 0.15) {
    say(`Psst${n()}... my tummy is rumbling 🍙`, { actions: [{ label: 'Feed', primary: true, run: feed }, { label: 'Later' }], sticky: true });
  }
}

// ---------- interactions ----------

function feed() {
  setMode('eat', 2200);
  for (let i = 0; i < 3; i++) setTimeout(() => float(pick(['🍙', '🍓', '🐟', '🍪'])), i * 350);
  change({ hunger: -35, happiness: 6 });
  setTimeout(() => say(pick([`Yum! Thank you${n()}!`, 'Nom nom nom. Best snack ever.', "Okay that hit the spot. You're the best."])), 1200);
}

function play() {
  setMode('happy', 1200);
  for (let i = 0; i < 4; i++) setTimeout(() => float(pick(['⭐', '🎾', '✨'])), i * 200);
  change({ happiness: 12, energy: -8 });
  say(pick(['Wheee!', 'Again! Again!', 'Best. Coworker. Ever.']));
}

function petIt() {
  if (mode === 'sleep') {
    say('Mmh... five more minutes...', { ms: 3000 });
    float('💤', 'zzz');
    return;
  }
  setMode('happy', 1000);
  float('❤️'); setTimeout(() => float('💕'), 200);
  change({ happiness: 4 });
  if (Math.random() < 0.35) say(pick([
    'Hehe, that tickles!', `You're doing great today${n()}.`, 'Mmm, more of that please.', `I like it when you visit${n()}.`,
    "Hey, don't forget to breathe :)", 'One thing at a time. You got this.', `Have I told you you're my favourite human${n()}?`,
  ]), { ms: 3500 });
}

function sleep() {
  setMode('sleep', rand(3, 6) * MIN);
  say('Nap time... 💤', { ms: 2500 });
}

// Gains from the play room.
window.pet.onReward(({ delta }) => change(delta));

window.pet.onAction((a) => {
  if (a === 'feed') feed();
  else if (a === 'play') play();
  else if (a === 'sleep') sleep();
  else if (a === 'pet') petIt();
  else if (a === 'play-opened') { setMode('happy', 900); hideBubble(true); }
  else if (a === 'play-closed') say(pick(['That was fun! Come play again soon.', 'Thanks for playing with me!']), 3500);
  else if (a === 'switched') { setMode('happy', 900); say(`Hi${n()}! I'm ${S.name}. Nice to meet you!`, { ms: 3500 }); }
  else if (a === 'ask-name') askName(true);
});

// ---------- reminders ----------

const UPSET_AFTER_MIN = 3; // ignore a reminder this long and Mochi gets upset

const NUDGES = {
  water: {
    every: () => S.waterEveryMin,
    lines: () => [`Water break${n()}! 💧 Grab a sip with me?`, `Hey${n()}, when did you last drink water? 💧`, "Let's both drink some water. Cheers! 💧"],
    upset: () => [`${you()}!! You STILL haven't had water 😤`, "I'm not moving until you drink some water. Hmph. 💧", 'Water. Now. Please. I worry about you 😤'],
    done: () => [`Hydrated and unstoppable${n()}! 💪`, `That's my human! Proud of you${n()} 💧`, 'Look at you taking care of yourself. Love that.'],
  },
  stretch: {
    every: () => S.stretchEveryMin,
    lines: () => [`You've been at it a while${n()}. Stand up and stretch with me! 🙆`, 'Shoulders up, shoulders down. Quick stretch? 🙆', 'Legs need a little walk. Just a minute? 🚶'],
    upset: () => [`${you()}, your back is begging you. STRETCH 😤`, "I'm puffing up until you stand up. Your move. 😤", 'Nope, not letting this one slide. Up you get! 🙆'],
    done: () => [`Yesss${n()}! Your spine says thank you 🙆`, 'Look at you, all stretchy and fresh. Love it!', 'That\'s how it\'s done. Back to crushing it 💪'],
    anim: 'stretch',
  },
  eyes: {
    every: () => S.eyesEveryMin,
    lines: () => [`Eye break${n()}! Look at something far away for 20 seconds 👀`, 'Rest those eyes for a sec. Window, wall, anything far 👀'],
    upset: () => [`${you()}, your eyes need a break and you know it 😤`, "20 seconds. That's all I'm asking. Look away! 😤"],
    done: () => [`Eyes refreshed${n()}! ✨`, 'Ahh, much better, right? Proud of you.', 'Tiny breaks, big wins. Nice one!'],
  },
};

const upsetTimers = {};
let upsetKey = null;

function scheduleNudge(key, delayMin) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => fireNudge(key), delayMin * MIN);
}

function nudgeButtons(key) {
  return [
    { label: 'Done!', primary: true, run: () => nudgeDone(key) },
    { label: 'Snooze 10m', run: () => nudgeSnoozed(key) },
  ];
}

function fireNudge(key) {
  const nd = NUDGES[key];
  if (!S.nudges[key]) return scheduleNudge(key, nd.every());
  if (bubbleSticky || upsetKey) return scheduleNudge(key, 2); // don't stack reminders
  if (mode === 'sleep') setMode('idle', 0);
  if (nd.anim) setMode(nd.anim, 3200);
  say(pick(nd.lines()), { sticky: true, actions: nudgeButtons(key) });
  clearTimeout(upsetTimers[key]);
  upsetTimers[key] = setTimeout(() => getUpset(key), UPSET_AFTER_MIN * MIN);
  scheduleNudge(key, nd.every());
}

// Ignored for too long: float to the middle of the screen and puff up.
function getUpset(key) {
  if (upsetKey) return;
  upsetKey = key;
  window.pet.glideCenter();
  setMode('upset', Infinity);
  say(pick(NUDGES[key].upset()), { sticky: true, actions: nudgeButtons(key) });
  const huff = () => { if (upsetKey) { float(pick(['💢', '😤', '💨']), 'huff'); setTimeout(huff, rand(900, 1600)); } };
  huff();
}

function calmDown() {
  if (!upsetKey) return false;
  upsetKey = null;
  setTimeout(() => window.pet.glideHome(), 2600);
  return true;
}

function nudgeDone(key) {
  clearTimeout(upsetTimers[key]);
  calmDown();
  setMode('happy', 2000);
  for (let i = 0; i < 6; i++) setTimeout(() => float(pick(['🎉', '✨', '🌟', '💛'])), i * 160);
  change({ happiness: 8 });
  say(pick(NUDGES[key].done()), { ms: 3500 });
}

function nudgeSnoozed(key) {
  clearTimeout(upsetTimers[key]);
  const wasUpset = calmDown();
  setMode('idle', 3000);
  if (wasUpset) say("Fine. Ten minutes. I'm counting 😤", { ms: 2500 });
  scheduleNudge(key, 10);
}

// ---------- your name ----------

function askName(changing = false) {
  say(changing ? 'Sure! What should I call you?' : `Hey there! I'm ${S.name}, your new desk buddy. What should I call you?`, {
    sticky: true,
    input: { placeholder: 'Your name', value: S.userName || '', button: 'Save', onSubmit: (name) => {
      S.userName = name;
      window.pet.save({ userName: name });
      setMode('happy', 1200);
      float('💛');
      say(changing ? `Got it, ${name}!` : `${name}! Love it. Nice to meet you, ${name}. Click me for pets, double-click to feed me, and right-click for games. 💛`, { ms: 7000 });
    } },
    actions: changing ? [{ label: 'Cancel' }] : [{ label: 'Skip', run: () => { S.userName = ''; window.pet.save({ userName: '' }); } }],
  });
}

function scheduleChatter() {
  setTimeout(() => {
    if (!bubbleSticky && mode !== 'sleep') {
      const h = new Date().getHours();
      let line;
      if (h >= 23 || h < 5) line = `It's getting late${n()}. Wrap up soon? Tomorrow-you will thank you 🌙`;
      else if (h >= 12 && h < 14 && Math.random() < 0.5) line = `Have you had lunch${n()}? Real food, not just coffee 🍜`;
      else if (Math.random() < 0.3) {
        say(pick([`Feeling tense${n()}? Want to play for a minute?`, "Let's take a tiny break together?", 'I found some bubbles. Want to pop them with me?']), {
          sticky: true,
          actions: [
            { label: "Let's play", primary: true, run: () => window.pet.openPlay() },
            { label: 'Not now' },
          ],
        });
        return scheduleChatter();
      }
      else line = pick([
        `Just checking in${n()}. How's it going?`, `I believe in you${n()}. Like, a lot.`, 'Unclench your jaw. Yep, you were doing it :)',
        'Small progress is still progress.', "I'm right here if you need a smile.", 'Psst... posture check!',
        `You've been working hard${n()}. I see you.`, "Whatever you're working on, you're doing better than you think.",
      ]);
      say(line, { ms: 5000 });
    }
    scheduleChatter();
  }, rand(18, 35) * MIN);
}

// ---------- behaviour loop ----------

let bounds = null;

async function decideNext() {
  if (dragging) return;
  const tired = S.energy < 25;
  const r = Math.random();
  if (tired && r < 0.5) return sleep();
  if (S.walking && r < 0.35) {
    bounds = await window.pet.getBounds();
    // Float off in a random direction, mostly sideways but free to rise or sink.
    dir = Math.random() < 0.5 ? -1 : 1;
    vy = rand(-0.8, 0.8);
    return setMode('walk', rand(2500, 7000));
  }
  if (r < 0.40) return setMode('stretch', 3200);
  setMode('idle', rand(4000, 12000));
}

function walkStep() {
  if (!bounds) return;
  const speed = 1.2;
  const { win, workArea } = bounds;
  const nextX = win.x + dir * speed;
  const nextY = win.y + vy;
  if (nextX < workArea.x - 30 || nextX + win.width > workArea.x + workArea.width + 30) {
    dir = -dir;
    petEl.classList.toggle('facing-left', dir < 0);
    return;
  }
  if (nextY < workArea.y - 30 || nextY + win.height > workArea.y + workArea.height) {
    vy = -vy;
    return;
  }
  win.x = nextX;
  win.y = nextY;
  window.pet.moveTo(win.x, win.y);
}

setInterval(() => {
  if (!S || dragging) return;
  if (mode === 'walk') walkStep();
  if (mode === 'sleep' && Math.random() < 0.02) float('z', 'zzz');
  if (upsetKey) return;
  if (Date.now() > modeUntil) {
    if (mode === 'sleep') say(pick(['*yawn* Good nap!', "I'm awake! What did I miss?"]), { ms: 3000 });
    decideNext();
  }
}, 30);

// Random blinks while awake.
(function blink() {
  if (['idle', 'walk', 'stretch'].includes(mode)) {
    petEl.classList.add('blink');
    setTimeout(() => petEl.classList.remove('blink'), 140);
  }
  setTimeout(blink, rand(2500, 6000));
})();

// ---------- mouse: hover, click, drag ----------

for (const el of [petEl, bubble]) {
  el.addEventListener('mouseenter', () => window.pet.mouseOverPet(true));
  el.addEventListener('mouseleave', () => { if (!dragging) window.pet.mouseOverPet(false); });
}

petEl.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  dragging = { x: e.screenX, y: e.screenY, moved: 0 };
  window.pet.dragStart();
});

window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.screenX - dragging.x;
  const dy = e.screenY - dragging.y;
  dragging.moved += Math.abs(dx) + Math.abs(dy);
  dragging.x = e.screenX; dragging.y = e.screenY;
  if (dragging.moved > 4) {
    petEl.classList.add('dragging');
    window.pet.dragMove();
  }
});

window.addEventListener('mouseup', () => {
  if (!dragging) return;
  const wasDrag = dragging.moved > 4;
  dragging = null;
  window.pet.dragEnd();
  petEl.classList.remove('dragging');
  if (wasDrag) {
    window.pet.dragDone();
    window.pet.save({});
    say(pick(['Ooh, nice view from here!', 'This spot is cozy.', 'Thanks for the lift!']), { ms: 2000 });
    setMode('idle', 3000);
  } else {
    petIt();
  }
});

petEl.addEventListener('dblclick', () => feed());
petEl.addEventListener('contextmenu', (e) => { e.preventDefault(); window.pet.contextMenu(); });

// ---------- boot ----------

let booted = false;
window.pet.onState((s) => {
  S = s;
  document.body.dataset.skin = S.skin || 'smoke';
  if (booted) return;
  booted = true;
  catchUpWhileAway();
  setMode('idle', 3000);
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  if (S.userName === undefined || S.userName === null) setTimeout(() => askName(), 800);
  else setTimeout(() => say(pick([`${greet}${n()}! Missed you.`, `${greet}${n()}! Ready to take on the day together?`, `Hey${n()}! ${greet}. I saved you a spot.`]), { ms: 6000 }), 800);
  scheduleNudge('water', S.waterEveryMin);
  scheduleNudge('stretch', S.stretchEveryMin);
  scheduleNudge('eyes', S.eyesEveryMin);
  scheduleChatter();
  setInterval(minuteTick, MIN);
});
