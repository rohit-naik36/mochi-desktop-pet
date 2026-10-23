const petEl = document.getElementById('pet');
const fx = document.getElementById('fx');
const bubble = document.getElementById('bubble');
const bubbleText = document.getElementById('bubble-text');
const bubbleActions = document.getElementById('bubble-actions');

let S = null;              // persisted state from main
let mode = 'idle';         // idle | walk | sleep | happy | eat | stretch
let dir = 1;               // 1 = right, -1 = left
let modeUntil = 0;
let dragging = null;
let bubbleTimer = null;
let bubbleSticky = false;
const timers = {};

const MIN = 60_000;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v) => Math.max(0, Math.min(100, v));

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

function say(text, { actions = [], ms = 6000, sticky = false } = {}) {
  clearTimeout(bubbleTimer);
  bubbleText.textContent = text;
  bubbleActions.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.textContent = a.label;
    if (a.primary) b.className = 'primary';
    b.onclick = (e) => { e.stopPropagation(); hideBubble(true); a.run && a.run(); };
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
    say("My tummy is rumbling... 🍙", { actions: [{ label: 'Feed', primary: true, run: feed }, { label: 'Later' }], sticky: true });
  }
}

// ---------- interactions ----------

function feed() {
  setMode('eat', 2200);
  for (let i = 0; i < 3; i++) setTimeout(() => float(pick(['🍙', '🍓', '🐟', '🍪'])), i * 350);
  change({ hunger: -35, happiness: 6 });
  setTimeout(() => say(pick(['Yum! Thank you!', 'Nom nom nom.', 'That hit the spot!'])), 1200);
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
    'Hehe, that tickles!', "You're doing great today.", 'Purrr...', 'I like it when you visit.',
    "Don't forget to breathe :)", 'One thing at a time. You got this.',
  ]), { ms: 3500 });
}

function sleep() {
  setMode('sleep', rand(3, 6) * MIN);
  say('Nap time... 💤', { ms: 2500 });
}

window.pet.onAction((a) => {
  if (a === 'feed') feed();
  else if (a === 'play') play();
  else if (a === 'sleep') sleep();
  else if (a === 'pet') petIt();
  else if (a === 'switched') { setMode('happy', 900); say(`Hi! I'm ${S.name}. Nice to meet you!`, { ms: 3500 }); }
});

// ---------- reminders ----------

const NUDGES = {
  water: {
    every: () => S.waterEveryMin,
    lines: ['Water break! 💧 Grab a sip with me?', 'Hydration check 💧 Have you had water lately?', "Let's both drink some water 💧"],
  },
  stretch: {
    every: () => S.stretchEveryMin,
    lines: ["You've been at it a while. Stand up and stretch with me! 🙆", 'Shoulders up, shoulders down. Quick stretch? 🙆', 'Time to stretch those legs for a minute 🚶'],
    anim: 'stretch',
  },
  eyes: {
    every: () => S.eyesEveryMin,
    lines: ['20-20-20: look at something 20 feet away for 20 seconds 👀', 'Rest your eyes for a moment. Look out a window? 👀'],
  },
};

function scheduleNudge(key, delayMin) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => fireNudge(key), delayMin * MIN);
}

function fireNudge(key) {
  const n = NUDGES[key];
  if (!S.nudges[key]) return scheduleNudge(key, n.every());
  if (bubbleSticky) return scheduleNudge(key, 2); // don't stack reminders
  if (mode === 'sleep') setMode('idle', 0);
  if (n.anim) setMode(n.anim, 3200);
  say(pick(n.lines), {
    sticky: true,
    actions: [
      { label: 'Done!', primary: true, run: () => { setMode('happy', 1000); float('🌟'); change({ happiness: 8 }); say(pick(['Proud of you!', 'Nice! Feels good, right?', 'Yay! 🎉']), { ms: 2500 }); } },
      { label: 'Snooze 10m', run: () => scheduleNudge(key, 10) },
    ],
  });
  scheduleNudge(key, n.every());
}

function scheduleChatter() {
  setTimeout(() => {
    if (!bubbleSticky && mode !== 'sleep') {
      const h = new Date().getHours();
      let line;
      if (h >= 23 || h < 5) line = "It's getting late. Maybe wrap up soon? 🌙";
      else if (h >= 12 && h < 14 && Math.random() < 0.5) line = 'Have you had lunch? 🍜';
      else line = pick([
        'Just checking in. How is it going?', "I believe in you.", 'Remember to unclench your jaw :)',
        "Small progress is still progress.", "I'm right here if you need a smile.", 'Psst... posture check!',
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
    dir = Math.random() < 0.5 ? -1 : 1;
    return setMode('walk', rand(2500, 7000));
  }
  if (r < 0.40) return setMode('stretch', 3200);
  setMode('idle', rand(4000, 12000));
}

function walkStep() {
  if (!bounds) return;
  const speed = 1.6;
  const { win, workArea } = bounds;
  const nextX = win.x + dir * speed;
  if (nextX < workArea.x - 30 || nextX + win.width > workArea.x + workArea.width + 30) {
    dir = -dir;
    petEl.classList.toggle('facing-left', dir < 0);
    return;
  }
  win.x = nextX;
  window.pet.moveBy(dir * speed, 0);
}

setInterval(() => {
  if (!S || dragging) return;
  if (mode === 'walk') walkStep();
  if (mode === 'sleep' && Math.random() < 0.02) float('z', 'zzz');
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
    window.pet.dropToFloor();
    window.pet.save({});
    say(pick(['Whoa! New spot!', 'Wheee!', 'Thanks for the lift!']), { ms: 2000 });
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
  const greet = h < 12 ? 'Good morning!' : h < 18 ? 'Good afternoon!' : 'Good evening!';
  setTimeout(() => say(`${greet} I'm ${S.name}. Click me for pets, double-click to feed me. Right-click to pick a different buddy.`, { ms: 7000 }), 800);
  scheduleNudge('water', S.waterEveryMin);
  scheduleNudge('stretch', S.stretchEveryMin);
  scheduleNudge('eyes', S.eyesEveryMin);
  scheduleChatter();
  setInterval(minuteTick, MIN);
});
