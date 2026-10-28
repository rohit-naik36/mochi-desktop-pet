// Mochi Pulse start: sign in with the company's Pulse key and load its team
// totals from the Teams server, or show the sample company for a demo. The
// dashboard scripts load only once the data is here.
(function () {
  // The Teams server address, passed in by main.js.
  const SERVER = new URLSearchParams(location.search).get('server') || '';
  const KEY = 'mochi-pulse-key';
  const $ = (id) => document.getElementById(id);
  const sample = window.PULSE_SAMPLE;

  function load(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.body.append(s);
    });
  }

  async function show(data, seats) {
    window.PULSE_SAMPLE = data;
    window.PULSE_SEATS = seats || null;
    $('signin').hidden = true;
    $('app').hidden = false;
    document.querySelector('.mp-chip.sample').hidden = !data.sample;
    if (seats) {
      const now = seats.months[0];
      $('seats').textContent = `Active seats this month: ${now ? now.active : 0}` + (seats.committed ? ` of ${seats.committed}` : '');
      $('seats').hidden = false;
    }
    if (!data.weeks.length || !data.weekly['All teams']) {
      const p = document.createElement('p');
      p.className = 'mp-empty';
      p.textContent = 'Nothing to show yet. Pulse appears once at least 8 people have used Mochi with insights on for a full week. Totals arrive a day or two after each week ends.';
      document.querySelector('.mp-head').after(p);
      document.querySelectorAll('.mp > section').forEach((s) => { s.hidden = true; });
      return;
    }
    for (const src of ['shim.js', 'picker.js', 'page.js', 'reports.js']) await load(src);
  }

  async function open(key) {
    const res = await fetch(SERVER + '/pulse', { method: 'POST', headers: { 'x-pulse-key': key, 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(20000) });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('key');
    if (!res.ok || !body.ok) throw new Error('server');
    return body;
  }

  function signin(message) {
    $('signin').hidden = false;
    $('app').hidden = true;
    $('signin-msg').textContent = message || '';
    if (!SERVER) {
      $('key').disabled = true; $('open').disabled = true;
      $('signin-msg').textContent = 'This copy of Pulse is not connected to a company yet.';
    }
  }

  $('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = $('key').value.trim();
    $('open').disabled = true;
    $('signin-msg').textContent = '';
    try {
      const body = await open(key);
      try { if ($('remember').checked) localStorage.setItem(KEY, key); } catch { /* storage off */ }
      await show(body.pulse, body.seats);
    } catch (err) {
      $('signin-msg').textContent = err.message === 'key'
        ? "That key didn't work. Check it, or ask Little Smoke Studio for a new one."
        : "Pulse couldn't reach the server. Check your connection and try again.";
    } finally { $('open').disabled = false; }
  });
  $('sample').addEventListener('click', () => show(sample));
  $('signout').addEventListener('click', () => {
    try { localStorage.removeItem(KEY); } catch { /* storage off */ }
    location.reload();
  });

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* storage off */ }
  // The demo app opens Pulse straight on the sample company.
  if (new URLSearchParams(location.search).get('sample') === '1') show(sample);
  else if (saved && SERVER) open(saved).then((b) => show(b.pulse, b.seats), (err) => signin(err.message === 'key' ? 'Your key no longer works. Ask Little Smoke Studio for a new one.' : ''));
  else signin();
})();
