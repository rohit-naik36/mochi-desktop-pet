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
// T('water.lines') -> a line in the chosen language with name/pet filled in.
const T = (key, extra = {}) => window.I18N.t((S && S.lang) || 'en', key, { name: S && S.userName, pet: S && S.name, gender: S && S.petGender, ...extra });

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
    say(T('hungry'), { actions: [{ label: T('feedBtn'), primary: true, run: feed }, { label: T('laterBtn') }], sticky: true });
  }
}

// ---------- interactions ----------

function feed() {
  setMode('eat', 2200);
  for (let i = 0; i < 3; i++) setTimeout(() => float(pick(['🍙', '🍓', '🐟', '🍪'])), i * 350);
  change({ hunger: -35, happiness: 6 });
  setTimeout(() => say(T('fed')), 1200);
}

function play() {
  setMode('happy', 1200);
  for (let i = 0; i < 4; i++) setTimeout(() => float(pick(['⭐', '🎾', '✨'])), i * 200);
  change({ happiness: 12, energy: -8 });
  say(pick(['Wheee!', 'Again! Again!', 'Best. Coworker. Ever.']));
}

function petIt() {
  if (mode === 'sleep') {
    say(T('sleepyPet'), { ms: 3000 });
    float('💤', 'zzz');
    return;
  }
  setMode('happy', 1000);
  float('❤️'); setTimeout(() => float('💕'), 200);
  change({ happiness: 4 });
  if (Math.random() < 0.35) say(T('petted'), { ms: 3500 });
}

function sleep() {
  setMode('sleep', rand(3, 6) * MIN);
  say(T('nap'), { ms: 2500 });
}

// Gains from the play room.
window.pet.onReward(({ delta }) => change(delta));

window.pet.onAction((a) => {
  if (a === 'feed') feed();
  else if (a === 'play') play();
  else if (a === 'sleep') sleep();
  else if (a === 'pet') petIt();
  else if (a === 'play-opened') { setMode('happy', 900); hideBubble(true); }
  else if (a === 'play-closed') say(T('playClosed'), { ms: 3500 });
  else if (a === 'switched') { setMode('happy', 900); say(T('switched'), { ms: 3500 }); }
  else if (a === 'back-from-hiding') { setMode('idle', 3000); say(T('backFromHiding'), { ms: 6000 }); }
  else if (a === 'ask-name') askName(true);
  else if (a === 'gender-changed') { setMode('happy', 1200); float('💛'); say(T('genderSaved.' + S.petGender), { ms: 4000 }); }
});

// ---------- reminders ----------

const UPSET_AFTER_MIN = 3; // ignore a reminder this long and Mochi gets upset

const NUDGES = {
  water: { every: () => S.waterEveryMin },
  stretch: { every: () => S.stretchEveryMin, anim: 'stretch' },
  eyes: { every: () => S.eyesEveryMin },
};

const upsetTimers = {};
let upsetKey = null;

function scheduleNudge(key, delayMin) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => fireNudge(key), delayMin * MIN);
}

function nudgeButtons(key) {
  return [
    { label: T('doneBtn'), primary: true, run: () => nudgeDone(key) },
    { label: T('snoozeBtn'), run: () => nudgeSnoozed(key) },
  ];
}

function fireNudge(key) {
  const nd = NUDGES[key];
  if (!S.nudges[key]) return scheduleNudge(key, nd.every());
  if (bubbleSticky || upsetKey) return scheduleNudge(key, 2); // don't stack reminders
  if (mode === 'sleep') setMode('idle', 0);
  if (nd.anim) setMode(nd.anim, 3200);
  say(T(key + '.lines'), { sticky: true, actions: nudgeButtons(key) });
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
  say(T(key + '.upset'), { sticky: true, actions: nudgeButtons(key) });
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
  say(T(key + '.done'), { ms: 3500 });
}

function nudgeSnoozed(key) {
  clearTimeout(upsetTimers[key]);
  const wasUpset = calmDown();
  setMode('idle', 3000);
  if (wasUpset) say(T('snoozedGrumpy'), { ms: 2500 });
  scheduleNudge(key, 10);
}

// ---------- your name ----------

function askName(changing = false, retry = false) {
  say(retry ? T('notAName') : changing ? T('askNameChange') : T('askName'), {
    sticky: true,
    input: { placeholder: T('namePlaceholder'), value: retry ? '' : S.userName || '', button: T('save'), onSubmit: (name) => {
      if (window.Profanity.analyse(name, S.name).profane) return askName(changing, true);
      S.userName = name;
      window.pet.save({ userName: name });
      setMode('happy', 1200);
      float('💛');
      if (changing) say(T('nameSavedChange'), { ms: 4000 });
      else if (!S.petGender) askGender(() => say(T('nameSaved'), { ms: 7000 }));
      else say(T('nameSaved'), { ms: 7000 });
    } },
    actions: changing ? [{ label: T('cancel') }] : [{ label: T('skip'), run: () => { S.userName = ''; window.pet.save({ userName: '' }); if (!S.petGender) askGender(); } }],
  });
}

// Boy, girl or non-binary: the user decides. It changes how the buddy talks
// about itself in Hindi and Hinglish.
function askGender(then) {
  say(T('askGender'), {
    sticky: true,
    actions: ['male', 'female', 'nonbinary'].map((g) => ({
      label: T('gender.' + g),
      run: () => {
        S.petGender = g;
        window.pet.save({ petGender: g });
        setMode('happy', 1200);
        float('💛');
        say(T('genderSaved.' + g), { ms: 3500 });
        if (then) setTimeout(then, 3600);
      },
    })),
  });
}

// After a move, say something about where it landed: a corner, the top,
// an edge, the middle, a long flight, or "I'm dizzy" after lots of moves.
const recentDrops = [];
async function reactToSpot(distance) {
  const now = Date.now();
  recentDrops.push(now);
  while (recentDrops.length && now - recentDrops[0] > 60_000) recentDrops.shift();
  const { win, workArea: wa } = await window.pet.getBounds();
  const cx = (win.x + win.width / 2 - wa.x) / wa.width;
  const cy = (win.y + win.height / 2 - wa.y) / wa.height;
  const nearX = cx < 0.15 ? 'left' : cx > 0.85 ? 'right' : null;
  const nearY = cy < 0.2 ? 'top' : cy > 0.8 ? 'bottom' : null;
  const h = new Date().getHours();
  let key;
  if (recentDrops.length >= 4) key = 'dizzy';
  else if (distance > 900 && Math.random() < 0.6) key = 'far';
  else if (nearX && nearY) key = 'corner';
  else if (Math.abs(cx - 0.5) < 0.15 && Math.abs(cy - 0.5) < 0.2) key = 'middle';
  else if ((h >= 21 || h < 5) && Math.random() < 0.3) key = 'night';
  else key = Math.random() < 0.75 ? nearY || nearX || 'any' : 'any';
  // Now and then just a little sparkle instead of words, so it never gets old.
  if (key === 'any' && Math.random() < 0.25) return float(pick(['✨', '💛', '☁️']));
  say(T('drop.' + key), { ms: 2600 });
}

function scheduleChatter() {
  setTimeout(() => {
    if (!bubbleSticky && mode !== 'sleep') {
      const h = new Date().getHours();
      let line;
      if (h >= 23 || h < 5) line = T('lateNight');
      else if (h >= 12 && h < 14 && Math.random() < 0.5) line = T('lunch');
      else if (Math.random() < 0.3) {
        say(T('playInvite'), {
          sticky: true,
          actions: [
            { label: T('letsPlay'), primary: true, run: () => window.pet.openPlay() },
            { label: T('notNow') },
          ],
        });
        return scheduleChatter();
      }
      else line = T('chatter');
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
    if (mode === 'sleep') say(T('woke'), { ms: 3000 });
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
  const distance = dragging.moved;
  dragging = null;
  window.pet.dragEnd();
  petEl.classList.remove('dragging');
  if (wasDrag) {
    window.pet.dragDone();
    window.pet.save({});
    reactToSpot(distance);
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
  const greet = (window.I18N.STRINGS[S.lang || 'en'] || window.I18N.STRINGS.en).timeGreet[h < 12 ? 0 : h < 18 ? 1 : 2];
  if (S.userName === undefined || S.userName === null) setTimeout(() => askName(), 800);
  else if (!S.petGender) setTimeout(() => askGender(() => say(T('greet', { greet }), { ms: 6000 })), 800);
  else setTimeout(() => say(T('greet', { greet }), { ms: 6000 }), 800);
  scheduleNudge('water', S.waterEveryMin);
  scheduleNudge('stretch', S.stretchEveryMin);
  scheduleNudge('eyes', S.eyesEveryMin);
  scheduleChatter();
  setInterval(minuteTick, MIN);
});
