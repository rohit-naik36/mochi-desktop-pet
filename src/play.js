// Play mode: a transparent layer over the desktop. The buddy stays where it
// was and the games happen around it.
const petWrap = document.getElementById('pet-wrap');
const petEl = document.getElementById('pet');
const fx = document.getElementById('fx');
const speech = document.getElementById('speech');
const card = document.getElementById('card');

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const params = new URLSearchParams(location.search);
let S = { name: 'Mochi' };
// T('breatheIn') in the chosen language; L(lang, key) for a specific language.
const L = (lang, key, extra = {}) => window.I18N.t(lang, key, { name: S.userName, pet: S.name, ...extra });
const T = (key, extra) => L(S.lang || 'en', key, extra);
let current = null;
let soundOn = true;
try { soundOn = localStorage.getItem('sound') !== 'off'; } catch {}

// Pet position in this layer's coordinates (its centre).
const home = { x: +params.get('px') || innerWidth - 160, y: +params.get('py') || innerHeight - 120 };
const pos = { ...home };

// ---------- shared helpers ----------

function placePet(x, y) {
  pos.x = x; pos.y = y;
  petWrap.style.left = x + 'px';
  petWrap.style.top = y + 'px';
  document.body.style.setProperty('--px', x + 'px');
  document.body.style.setProperty('--py', y + 'px');
}

// Put the card above the pet, else below, else beside it, always on screen.
function placeCard() {
  card.classList.remove('hidden');
  const w = card.offsetWidth, h = card.offsetHeight;
  const clampX = (x) => Math.min(Math.max(x, 10), innerWidth - w - 10);
  const clampY = (y) => Math.min(Math.max(y, 70), innerHeight - h - 10);
  let left = clampX(pos.x - w / 2);
  let top;
  if (pos.y - 90 - h >= 70) top = pos.y - 90 - h;
  else if (pos.y + 90 + h <= innerHeight - 10) top = pos.y + 90;
  else {
    top = clampY(pos.y - h / 2);
    left = pos.x + 90 + w <= innerWidth - 10 ? pos.x + 90 : clampX(pos.x - 90 - w);
  }
  card.style.left = left + 'px';
  card.style.top = top + 'px';
}

function mood(m) {
  const left = petEl.classList.contains('facing-left');
  petEl.className = m;
  if (left) petEl.classList.add('facing-left');
}

let speechTimer;
function say(text, ms = 3200) {
  clearTimeout(speechTimer);
  speech.textContent = text;
  speech.style.left = pos.x + 'px';
  speech.style.top = (pos.y - 62) + 'px';
  speech.classList.remove('hidden');
  speechTimer = setTimeout(() => speech.classList.add('hidden'), ms);
}

function float(text, x, y) {
  const el = document.createElement('div');
  el.className = 'float';
  el.style.position = 'fixed';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  fx.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function happy(ms = 1000) {
  mood('happy');
  setTimeout(() => current !== 'breathe' && mood('idle'), ms);
}

// Soft synthesized sounds, nothing loaded from disk.
let audio;
function tone(freq, dur = 0.12, type = 'sine', vol = 0.08, slide = 0) {
  if (!soundOn) return;
  audio = audio || new AudioContext();
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audio.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, audio.currentTime + dur);
  g.gain.setValueAtTime(vol, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
  o.connect(g).connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + dur);
}
const popSound = () => tone(rand(500, 900), 0.09, 'sine', 0.09, 1.8);
const chime = () => { tone(660, 0.5, 'sine', 0.05); setTimeout(() => tone(990, 0.6, 'sine', 0.04), 120); };

// ---------- switching games ----------

const games = { breathe: Breathe(), bubbles: Bubbles(), chase: Chase(), worry: Worry() };

function show(name) {
  if (current) games[current].stop();
  current = name;
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('active', b.dataset.game === name);
  for (const p of document.querySelectorAll('.panel')) p.classList.toggle('active', p.id === name);
  petWrap.className = '';
  document.body.classList.remove('chasing');
  mood('idle');
  speech.classList.add('hidden');
  games[name].start();
  placeCard();
}

function finish() {
  if (current) games[current].stop();
  window.play.done(pos.x, pos.y);
}

document.getElementById('tabs').addEventListener('click', (e) => {
  const g = e.target.closest('button')?.dataset.game;
  if (g) show(g);
});
document.getElementById('close').onclick = finish;
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); });
const soundBtn = document.getElementById('sound');
const paintSound = () => { soundBtn.textContent = soundOn ? '🔊' : '🔇'; };
soundBtn.onclick = () => { soundOn = !soundOn; paintSound(); try { localStorage.setItem('sound', soundOn ? 'on' : 'off'); } catch {} };
paintSound();

// ---------- 1. Breathe with me ----------
// Inhale 4s, hold 4s, exhale 6s, six rounds (about 84 seconds).

function Breathe() {
  const cue = document.getElementById('breathe-cue');
  const count = document.getElementById('breathe-count');
  const dots = document.getElementById('breathe-dots');
  const btn = document.getElementById('breathe-start');
  const ROUNDS = 6;
  let timers = [];
  let running = false;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  function paintDots(done) {
    dots.innerHTML = '';
    for (let i = 0; i < ROUNDS; i++) {
      const d = document.createElement('span');
      if (i < done) d.className = 'done';
      dots.appendChild(d);
    }
  }
  function countdown(sec) {
    for (let i = 0; i < sec; i++) later(() => { count.textContent = sec - i; }, i * 1000);
  }
  function round(n) {
    if (n === ROUNDS) return complete();
    cue.textContent = T('breatheIn');
    petWrap.className = 'inhale';
    mood('idle');
    countdown(4);
    tone(392, 1.2, 'sine', 0.03);
    later(() => { cue.textContent = T('breatheHold'); petWrap.className = 'hold'; countdown(4); }, 4000);
    later(() => { cue.textContent = T('breatheOut'); petWrap.className = 'exhale'; mood('sleep'); countdown(6); tone(294, 1.6, 'sine', 0.03); }, 8000);
    later(() => { paintDots(n + 1); round(n + 1); }, 14000);
  }
  function complete() {
    running = false;
    petWrap.className = '';
    cue.textContent = T('breatheDone');
    count.textContent = '';
    btn.textContent = T('breatheAgain');
    btn.classList.remove('hidden');
    happy(1600);
    chime();
    say(T('breatheAfter'));
    window.play.reward({ happiness: 10 });
  }
  btn.onclick = () => {
    if (running) return;
    running = true;
    btn.classList.add('hidden');
    paintDots(0);
    round(0);
  };
  return {
    start() { cue.textContent = T('breatheTitle'); count.textContent = ''; btn.textContent = T('breatheStart'); btn.classList.remove('hidden'); paintDots(0); },
    stop() { timers.forEach(clearTimeout); timers = []; running = false; petWrap.className = ''; },
  };
}

// ---------- 2. Bubble pop (across the whole screen) ----------

function Bubbles() {
  const field = document.getElementById('bubble-field');
  const counter = document.getElementById('pop-count');
  let popped = 0;
  let spawner;

  function spawn() {
    const b = document.createElement('div');
    const size = rand(30, 72);
    b.className = 'bub';
    b.style.width = b.style.height = size + 'px';
    b.style.left = rand(20, innerWidth - size - 20) + 'px';
    b.style.top = innerHeight + 'px';
    b.style.setProperty('--sway', rand(-80, 80) + 'px');
    b.style.animationDuration = rand(8, 15) + 's';
    b.addEventListener('pointerdown', () => pop(b));
    b.addEventListener('animationend', () => b.remove());
    field.appendChild(b);
  }

  function pop(b) {
    const r = b.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (let i = 0; i < 8; i++) {
      const bit = document.createElement('div');
      bit.className = 'pop-bit';
      bit.style.left = cx + 'px';
      bit.style.top = cy + 'px';
      const ang = (i / 8) * Math.PI * 2;
      bit.style.setProperty('--dx', Math.cos(ang) * 28 + 'px');
      bit.style.setProperty('--dy', Math.sin(ang) * 28 + 'px');
      document.body.appendChild(bit);
      setTimeout(() => bit.remove(), 520);
    }
    b.remove();
    popSound();
    popped++;
    counter.textContent = T('popped', { count: popped });
    // The buddy glances toward each pop.
    petEl.classList.toggle('facing-left', cx < pos.x);
    if (popped % 10 === 0) {
      happy();
      float('✨', pos.x - 8, pos.y - 70);
      say(T('bubbleCheer', { count: popped }), 1800);
      window.play.reward({ happiness: 3 });
    }
  }

  return {
    start() {
      popped = 0;
      counter.textContent = T('popped', { count: 0 });
      spawner = setInterval(spawn, 550);
      for (let i = 0; i < 6; i++) setTimeout(spawn, i * 150);
    },
    stop() { clearInterval(spawner); field.innerHTML = ''; petEl.classList.remove('facing-left'); },
  };
}

// ---------- 3. Chase the light (anywhere on screen) ----------

function Chase() {
  const orb = document.getElementById('orb');
  const counter = document.getElementById('catch-count');
  let mouse = null;
  let raf;
  let catches = 0;
  let lastCatch = 0;

  function onMove(e) {
    if (e.target.closest('#toolbar, #card')) { orb.classList.add('hidden'); return; }
    mouse = { x: e.clientX, y: e.clientY };
    orb.style.left = mouse.x + 'px';
    orb.style.top = mouse.y + 'px';
    orb.classList.remove('hidden');
  }

  function tick() {
    if (mouse) {
      // Ease toward the light so it feels floaty.
      placePet(pos.x + (mouse.x - pos.x) * 0.03, pos.y + (mouse.y - pos.y) * 0.03);
      petEl.classList.toggle('facing-left', mouse.x < pos.x);
      const d = Math.hypot(mouse.x - pos.x, mouse.y - pos.y);
      if (d < 24 && Date.now() - lastCatch > 1500) {
        lastCatch = Date.now();
        catches++;
        counter.textContent = catches === 1 ? T('caughtOne') : T('caught', { count: catches });
        happy(900);
        float('💛', pos.x - 10, pos.y - 70);
        tone(880, 0.25, 'triangle', 0.04, 1.3);
        if (catches % 5 === 0) { say(T('chaseCheer'), 1800); window.play.reward({ happiness: 4 }); }
      }
    }
    raf = requestAnimationFrame(tick);
  }

  return {
    start() {
      petWrap.className = 'free';
      document.body.classList.add('chasing');
      counter.textContent = '';
      catches = 0;
      mouse = null;
      document.addEventListener('mousemove', onMove);
      raf = requestAnimationFrame(tick);
    },
    stop() {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousemove', onMove);
      orb.classList.add('hidden');
      document.body.classList.remove('chasing');
      petEl.classList.remove('facing-left');
    },
  };
}

// ---------- 4. Feed a worry ----------

function Worry() {
  const text = document.getElementById('worry-text');
  const btn = document.getElementById('worry-feed');
  const letters = document.getElementById('worry-letters');
  const reply = document.getElementById('worry-reply');
  const parts = {
    opener: document.getElementById('reply-opener'),
    reflect: document.getElementById('reply-reflect'),
    comfort: document.getElementById('reply-comfort'),
    step: document.getElementById('reply-step'),
    ask: document.getElementById('reply-ask'),
    helplines: document.getElementById('reply-helplines'),
    actions: document.getElementById('reply-actions'),
  };

  const hint = document.getElementById('worry-hint');
  function askMode() {
    hint.classList.remove('hidden');
    reply.classList.add('hidden');
    text.classList.remove('hidden');
    btn.classList.remove('hidden');
    btn.disabled = false;
    placeCard();
    setTimeout(() => text.focus(), 50);
  }

  function showReply(r) {
    text.classList.add('hidden');
    btn.classList.add('hidden');
    hint.classList.add('hidden');
    reply.classList.toggle('serious', !!r.serious);
    parts.opener.textContent = r.opener;
    parts.reflect.textContent = r.reflect;
    parts.comfort.textContent = r.comfort;
    parts.step.textContent = r.step;
    parts.ask.textContent = r.ask || '';
    parts.helplines.innerHTML = '';
    parts.helplines.classList.toggle('hidden', !r.helplines);
    for (const h of r.helplines || []) {
      const line = document.createElement('div');
      line.className = 'line';
      const n = document.createElement('span'); n.textContent = h.name;
      const num = document.createElement('span'); num.className = 'num'; num.textContent = h.number;
      line.append(n, num);
      parts.helplines.appendChild(line);
    }
    parts.actions.innerHTML = '';
    const lang = r.lang || S.lang || 'en';
    const labels = { another: L(lang, 'feedAnother'), breathe: L(lang, 'breatheWithMe') };
    document.documentElement.style.setProperty('--tiny-step', JSON.stringify(L(lang, 'tinyStep')));
    for (const f of r.followups) {
      const b = document.createElement('button');
      b.className = f === r.followups[0] ? 'cta' : 'ghost';
      b.textContent = f === 'thanks' ? (r.serious ? L(lang, 'okay') : L(lang, 'thanks')) : labels[f];
      b.onclick = () => {
        if (f === 'another') askMode();
        else if (f === 'breathe') show('breathe');
        else if (r.serious) { say(L(lang, 'crisisStay'), 4000); }
        else { happy(1200); say(L(lang, 'thanksReply'), 2500); setTimeout(finish, 1800); }
      };
      parts.actions.appendChild(b);
    }
    reply.classList.remove('hidden');
    placeCard();
  }

  function feed() {
    const words = text.value.trim();
    if (!words) { text.focus(); say(T('typeSomething'), 2000); return; }
    btn.disabled = true;
    const said = window.WorryEater.detectLang(words, S.lang || 'en');
    const lang = said === 'other' ? S.lang || 'en' : said;
    const rude = window.Profanity.analyse(words, S.name);
    if (rude.atPet) return refuse(words, lang);
    const tr = text.getBoundingClientRect();
    mood('eat');
    [...words].forEach((ch, i) => {
      const el = document.createElement('span');
      el.className = 'letter';
      el.textContent = ch;
      const sx = tr.left + 10 + (i % 34) * 8;
      const sy = tr.top + 12 + Math.floor(i / 34) * 18;
      el.style.left = sx + 'px';
      el.style.top = sy + 'px';
      letters.appendChild(el);
      setTimeout(() => {
        el.style.transform = `translate(${pos.x - sx + rand(-8, 8)}px, ${pos.y - sy}px) scale(.2) rotate(${rand(-180, 180)}deg)`;
        el.style.opacity = '0';
      }, 30 + i * 16);
      setTimeout(() => el.remove(), 1600 + i * 16);
    });
    text.value = '';
    text.classList.add('hidden');
    const total = 1500 + Math.min(words.length, 280) * 16;
    setTimeout(() => tone(220, 0.25, 'sine', 0.06, 0.6), total - 200);
    setTimeout(() => {
      const r = window.WorryEater.respond(words, S.userName, S.lang || 'en');
      // Swearing about a situation is just venting: acknowledge the feeling.
      if (rude.profane && !r.serious) r.comfort = L(r.lang, 'ventNote') + ' ' + r.comfort;
      mood(r.serious ? 'idle' : 'happy');
      setTimeout(() => mood('idle'), 1400);
      showReply(r);
      window.play.reward({ happiness: 6, hunger: -5 });
    }, total);
  }

  // Swearing at Mochi: no eating. Two warnings, then Mochi goes to hide.
  async function refuse(words, lang) {
    text.value = '';
    mood('upset');
    const strikes = await window.play.strike();
    const key = strikes >= 3 ? 'hiding' : strikes === 2 ? 'warn2' : 'warn1';
    say(L(lang, key), strikes >= 3 ? 4000 : 5000);
    window.play.reward({ happiness: -6 });
    if (strikes >= 3) { setTimeout(() => window.play.hide(), 2800); return; }
    setTimeout(() => { mood('idle'); askMode(); }, 2600);
  }

  btn.onclick = feed;
  text.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); feed(); } });

  return {
    start() { askMode(); },
    stop() { letters.innerHTML = ''; },
  };
}

// ---------- boot ----------

placePet(home.x, home.y);
window.play.getState().then((s) => {
  S = s;
  document.body.dataset.skin = s.skin || 'smoke';
  document.getElementById('title').textContent = T('playTitle');
  for (const b of document.querySelectorAll('#tabs button')) b.textContent = T('tabs.' + b.dataset.game);
  document.querySelector('#bubbles .hint').textContent = T('bubblesHint');
  document.querySelector('#chase .hint').textContent = T('chaseHint');
  document.getElementById('worry-hint').textContent = T('worryHint');
  document.getElementById('worry-text').placeholder = T('worryPlaceholder');
  document.getElementById('worry-feed').textContent = T('feedIt');
  document.documentElement.style.setProperty('--tiny-step', JSON.stringify(T('tinyStep')));
  show(params.get('game') || 'breathe');
});
