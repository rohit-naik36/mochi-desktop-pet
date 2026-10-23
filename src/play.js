// Play room: small calming games with your buddy.
const arena = document.getElementById('arena');
const petWrap = document.getElementById('pet-wrap');
const petEl = document.getElementById('pet');
const fx = document.getElementById('fx');
const speech = document.getElementById('speech');

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
let S = { name: 'Mochi' };
let current = null;
let soundOn = true;
try { soundOn = localStorage.getItem('sound') !== 'off'; } catch {}

// ---------- shared helpers ----------

function mood(m) { petEl.className = m; }

let speechTimer;
function say(text, ms = 3200) {
  clearTimeout(speechTimer);
  speech.textContent = text;
  speech.classList.remove('hidden');
  speechTimer = setTimeout(() => speech.classList.add('hidden'), ms);
}

function float(text, x, y) {
  const el = document.createElement('div');
  el.className = 'float';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  fx.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function petCenter() {
  const r = petWrap.getBoundingClientRect();
  const a = arena.getBoundingClientRect();
  return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
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

// ---------- tabs ----------

const games = { breathe: Breathe(), bubbles: Bubbles(), chase: Chase(), worry: Worry() };

function show(name) {
  if (current) games[current].stop();
  current = name;
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('active', b.dataset.game === name);
  for (const p of document.querySelectorAll('.panel')) p.classList.toggle('hidden', p.id !== name);
  petWrap.className = '';
  petWrap.style.left = petWrap.style.top = '';
  arena.className = '';
  mood('idle');
  speech.classList.add('hidden');
  games[name].start();
}

document.getElementById('tabs').addEventListener('click', (e) => {
  const g = e.target.closest('button')?.dataset.game;
  if (g) show(g);
});
document.getElementById('close').onclick = () => window.play.close();
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.play.close(); });
const soundBtn = document.getElementById('sound');
const paintSound = () => { soundBtn.textContent = soundOn ? '🔊' : '🔇'; };
soundBtn.onclick = () => { soundOn = !soundOn; paintSound(); try { localStorage.setItem('sound', soundOn ? 'on' : 'off'); } catch {} };
paintSound();

// ---------- 1. Breathe with me ----------
// Inhale 4s, hold 4s, exhale 6s. Six rounds is about 84 seconds.

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
    if (n === ROUNDS) return finish();
    cue.textContent = 'Breathe in...';
    petWrap.className = 'inhale';
    mood('idle');
    countdown(4);
    tone(392, 1.2, 'sine', 0.03);
    later(() => { cue.textContent = 'Hold'; petWrap.className = 'hold'; countdown(4); }, 4000);
    later(() => { cue.textContent = 'Breathe out...'; petWrap.className = 'exhale'; mood('sleep'); countdown(6); tone(294, 1.6, 'sine', 0.03); }, 8000);
    later(() => { paintDots(n + 1); round(n + 1); }, 14000);
  }
  function finish() {
    running = false;
    petWrap.className = '';
    cue.textContent = 'Nicely done';
    count.textContent = '';
    btn.textContent = 'Again';
    btn.classList.remove('hidden');
    happy(1600);
    chime();
    say(pick(['That felt good. Your shoulders look lighter.', 'Calm buddy, calm human.', 'Thanks for breathing with me.']));
    window.play.reward({ happiness: 10 }, 'That breathing break was lovely.');
  }
  btn.onclick = () => {
    if (running) return;
    running = true;
    btn.classList.add('hidden');
    paintDots(0);
    round(0);
  };
  return {
    start() { cue.textContent = 'Ready when you are'; count.textContent = ''; btn.textContent = 'Start (1 min)'; btn.classList.remove('hidden'); paintDots(0); },
    stop() { timers.forEach(clearTimeout); timers = []; running = false; },
  };
}

// ---------- 2. Bubble pop ----------

function Bubbles() {
  const field = document.getElementById('bubble-field');
  const counter = document.getElementById('pop-count');
  let popped = 0;
  let spawner;

  function spawn() {
    const b = document.createElement('div');
    const size = rand(28, 64);
    b.className = 'bub';
    b.style.width = b.style.height = size + 'px';
    b.style.left = rand(10, field.clientWidth - size - 10) + 'px';
    b.style.top = field.clientHeight + 'px';
    b.style.setProperty('--sway', rand(-60, 60) + 'px');
    b.style.animationDuration = rand(6, 11) + 's';
    b.addEventListener('pointerdown', () => pop(b));
    b.addEventListener('animationend', () => b.remove());
    field.appendChild(b);
  }

  function pop(b) {
    const r = b.getBoundingClientRect();
    const a = arena.getBoundingClientRect();
    const cx = r.left - a.left + r.width / 2;
    const cy = r.top - a.top + r.height / 2;
    for (let i = 0; i < 8; i++) {
      const bit = document.createElement('div');
      bit.className = 'pop-bit';
      bit.style.left = cx + 'px';
      bit.style.top = cy + 'px';
      const ang = (i / 8) * Math.PI * 2;
      bit.style.setProperty('--dx', Math.cos(ang) * 26 + 'px');
      bit.style.setProperty('--dy', Math.sin(ang) * 26 + 'px');
      arena.appendChild(bit);
      setTimeout(() => bit.remove(), 520);
    }
    b.remove();
    popSound();
    popped++;
    counter.textContent = `${popped} popped`;
    if (popped % 10 === 0) {
      happy();
      float('✨', petCenter().x, petCenter().y - 50);
      say(pick(['So satisfying!', 'Pop pop pop!', `${popped}! You're a natural.`, 'I love this game.']), 1800);
      window.play.reward({ happiness: 3 });
    }
  }

  return {
    start() {
      petWrap.className = 'small';
      petWrap.style.top = '80%';
      popped = 0;
      counter.textContent = '0 popped';
      spawner = setInterval(spawn, 650);
      for (let i = 0; i < 4; i++) setTimeout(spawn, i * 200);
    },
    stop() { clearInterval(spawner); field.innerHTML = ''; },
  };
}

// ---------- 3. Chase the light ----------

function Chase() {
  const orb = document.getElementById('orb');
  const counter = document.getElementById('catch-count');
  let mouse = null;
  let pos = null;
  let raf;
  let catches = 0;
  let lastCatch = 0;

  function onMove(e) {
    const a = arena.getBoundingClientRect();
    mouse = { x: e.clientX - a.left, y: e.clientY - a.top };
    orb.style.left = mouse.x + 'px';
    orb.style.top = mouse.y + 'px';
    orb.classList.remove('hidden');
  }

  function tick() {
    if (mouse) {
      // Ease toward the light; slower when it's far so it feels floaty.
      pos.x += (mouse.x - pos.x) * 0.035;
      pos.y += (mouse.y - pos.y) * 0.035;
      petWrap.style.left = pos.x + 'px';
      petWrap.style.top = pos.y + 'px';
      petEl.classList.toggle('facing-left', mouse.x < pos.x);
      const d = Math.hypot(mouse.x - pos.x, mouse.y - pos.y);
      if (d < 22 && Date.now() - lastCatch > 1500) {
        lastCatch = Date.now();
        catches++;
        counter.textContent = `Caught it ${catches} time${catches === 1 ? '' : 's'}`;
        happy(900);
        float('💛', pos.x - 10, pos.y - 60);
        tone(880, 0.25, 'triangle', 0.04, 1.3);
        if (catches % 5 === 0) { say(pick(['Got it! Again!', 'Hehe, too slow!', 'This is the best.']), 1800); window.play.reward({ happiness: 4 }); }
      }
    }
    raf = requestAnimationFrame(tick);
  }

  return {
    start() {
      petWrap.className = 'free small';
      const c = { x: arena.clientWidth / 2, y: arena.clientHeight * 0.6 };
      pos = { ...c };
      petWrap.style.left = pos.x + 'px';
      petWrap.style.top = pos.y + 'px';
      arena.classList.add('chasing');
      counter.textContent = '';
      catches = 0;
      mouse = null;
      arena.addEventListener('mousemove', onMove);
      raf = requestAnimationFrame(tick);
    },
    stop() {
      cancelAnimationFrame(raf);
      arena.removeEventListener('mousemove', onMove);
      orb.classList.add('hidden');
      petEl.classList.remove('facing-left');
    },
  };
}

// ---------- 4. Feed a worry ----------

function Worry() {
  const text = document.getElementById('worry-text');
  const btn = document.getElementById('worry-feed');
  const letters = document.getElementById('worry-letters');
  const replies = [
    "Mmm, gone. That one doesn't get to sit on you anymore.",
    'Eaten! You can take it one small step at a time.',
    "Crunchy. Whatever happens, you'll handle it.",
    "Gulp. It's a lot lighter out here now, right?",
    "All gone. You're doing better than you think.",
  ];

  function feed() {
    const words = text.value.trim();
    if (!words) { text.focus(); say('Type anything, big or small.', 2000); return; }
    btn.disabled = true;
    const tr = text.getBoundingClientRect();
    const a = arena.getBoundingClientRect();
    const target = petCenter();
    mood('eat');
    [...words].forEach((ch, i) => {
      const el = document.createElement('span');
      el.className = 'letter';
      el.textContent = ch;
      const sx = tr.left - a.left + 12 + (i % 40) * 8;
      const sy = tr.top - a.top + 14 + Math.floor(i / 40) * 18;
      el.style.left = sx + 'px';
      el.style.top = sy + 'px';
      letters.appendChild(el);
      setTimeout(() => {
        el.style.transform = `translate(${target.x - sx + rand(-8, 8)}px, ${target.y - sy}px) scale(.2) rotate(${rand(-180, 180)}deg)`;
        el.style.opacity = '0';
      }, 30 + i * 18);
      setTimeout(() => el.remove(), 1600 + i * 18);
    });
    text.value = '';
    const total = 1500 + words.length * 18;
    setTimeout(() => tone(220, 0.25, 'sine', 0.06, 0.6), total - 200);
    setTimeout(() => {
      happy(1400);
      say(pick(replies), 4200);
      window.play.reward({ happiness: 6, hunger: -5 });
      btn.disabled = false;
    }, total);
  }

  btn.onclick = feed;
  text.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); feed(); } });

  return {
    start() { arena.classList.add('worry-mode'); setTimeout(() => text.focus(), 50); },
    stop() { letters.innerHTML = ''; btn.disabled = false; },
  };
}

// ---------- boot ----------

window.play.getState().then((s) => {
  S = s;
  document.body.dataset.skin = s.skin || 'smoke';
  document.getElementById('title').textContent = `Play time with ${s.name}`;
  const start = new URLSearchParams(location.search).get('game') || 'breathe';
  show(start);
});
