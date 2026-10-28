// Mochi for Teams window: join a company, choose a team, turn anonymous
// insights on or off, and see exactly what would be shared.
const $ = (id) => document.getElementById(id);

const THEME = { deadline: 'Deadlines and workload', work: 'Work and colleagues', study: 'Studies and exams', money: 'Money', people: 'Relationships', health: 'Health and sleep', self: 'Self-doubt', future: 'Future and career', general: 'Something else' };
const MOOD = { 1: '😞 Very low', 2: '🙁 Low', 3: '😐 Okay', 4: '🙂 Good', 5: '😄 Great' };
const FEATURE = { feed: 'Fed Mochi', pet: 'Petted Mochi', breathe: 'Breathing exercise', bubble: 'Bubble pop', chase: 'Chase the light', worry: 'Feed me a worry', focus: 'Focus sessions', mood: 'Mood check-ins', gratitude: 'Gratitude jar', win: 'Good news shared' };

function list(obj, names) {
  const parts = Object.entries(obj || {}).filter(([, v]) => v > 0).map(([k, v]) => `${names[k] || k}: ${v}`);
  return parts.length ? parts.join('\n') : 'None';
}

function contactLine(c) {
  const line = document.createElement('div');
  line.className = 'line';
  const n = document.createElement('span'); n.textContent = c.name;
  const num = document.createElement('span'); num.className = 'num'; num.textContent = c.number;
  line.append(n, num);
  return line;
}

let privacyOpen = false;
let changing = false; // showing the options again to change an answer

const dateLabel = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function renderQuestion(q, insightsOn) {
  $('question').classList.toggle('hidden', !q);
  if (!q) return;
  $('q-text').textContent = q.text;
  $('q-off').classList.toggle('hidden', insightsOn);
  const answered = q.answer != null && !changing;
  $('q-done').classList.toggle('hidden', !answered || !insightsOn);
  if (answered) {
    $('q-done').textContent = q.answer >= 0 ? `You answered "${q.options[q.answer]}". Thank you! ` : 'You skipped this one. ';
    const again = document.createElement('button');
    again.type = 'button'; again.className = 'link inline';
    again.textContent = q.answer >= 0 ? 'Change my answer' : 'Answer after all';
    again.addEventListener('click', () => { changing = true; if (last) render(last); });
    $('q-done').append(again);
  }
  const buttons = insightsOn && !answered ? [
    ...q.options.map((o, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = o; b.addEventListener('click', () => { changing = false; window.teams.answer(q.id, i); }); return b; }),
    ...(q.answer == null ? [Object.assign(document.createElement('button'), { type: 'button', className: 'skip', textContent: 'Skip' })] : []),
  ] : [];
  for (const b of buttons) if (b.className === 'skip') b.addEventListener('click', () => window.teams.answer(q.id, -1));
  $('q-options').replaceChildren(...buttons);
}

function render(v) {
  const co = v.company;
  if (v.demoCode && !$('code').value) $('code').value = v.demoCode; // the demo app fills in its own code
  const asking = !!co && co.asked === false;
  $('join').classList.toggle('hidden', !!co);
  $('consent').classList.toggle('hidden', !asking);
  $('joined').classList.toggle('hidden', !co || asking);
  document.querySelectorAll('.min-group').forEach((e) => { e.textContent = v.minGroup; });
  $('round-to').textContent = v.roundTo;
  if (!co) return;
  document.querySelectorAll('.co-short').forEach((e) => { e.textContent = co.name; });
  $('co-name').textContent = co.name;
  $('co-demo').classList.toggle('hidden', !co.demo);
  $('co-paused').classList.toggle('hidden', !co.lapsed);
  $('paused-note').classList.toggle('hidden', !co.lapsed);
  $('co-welcome').textContent = co.welcome || '';
  $('co-welcome').classList.toggle('hidden', !co.welcome);
  $('co-support').replaceChildren(...[...co.support, co.posh].filter(Boolean).map(contactLine));
  const sel = $('team');
  sel.replaceChildren(new Option('Choose your team', ''));
  for (const t of co.teams) sel.append(new Option(t, t));
  sel.value = co.team || '';
  $('insights').checked = !!co.insights;
  $('privacy').classList.toggle('hidden', !privacyOpen);
  $('privacy-btn').setAttribute('aria-expanded', String(privacyOpen));

  // The company's wellness campaign this week, if any.
  const camp = v.campaign;
  $('campaign').classList.toggle('hidden', !camp);
  if (camp) {
    $('campaign-name').textContent = camp.name;
    $('campaign-dates').textContent = `${dateLabel(camp.start)} to ${dateLabel(camp.end)}`;
    $('campaign-note').textContent = camp.note || '';
    $('campaign-note').classList.toggle('hidden', !camp.note);
  }
  renderQuestion(v.question, !!co.insights);

  // Your week: this person's own counts, shown to them alone.
  const p = v.packet;
  const sum = (o) => Object.values(o || {}).reduce((x, y) => x + y, 0);
  const tiles = [
    [p.activeDays, p.activeDays === 1 ? 'day with Mochi' : 'days with Mochi'],
    [sum(p.moodCheckIns), sum(p.moodCheckIns) === 1 ? 'mood check-in' : 'mood check-ins'],
    [p.reminders.away, p.reminders.away === 1 ? 'real break' : 'real breaks'],
    [p.calls.count, p.calls.count === 1 ? 'call' : 'calls'],
  ];
  const empty = tiles.every(([n]) => !n);
  $('tiles').classList.toggle('hidden', empty);
  $('week-empty').classList.toggle('hidden', !empty);
  $('tiles').replaceChildren(...tiles.map(([n, k]) => {
    const t = document.createElement('div'); t.className = 'tile';
    const a = document.createElement('div'); a.className = 'v'; a.textContent = n;
    const b = document.createElement('div'); b.className = 'k'; b.textContent = k;
    t.append(a, b);
    return t;
  }));

  const rows = co.insights ? [
    ['Team', p.team || 'Not chosen yet'],
    ['Week starting', p.week],
    ['Days you used Mochi', p.activeDays],
    ['Days used after bedtime', p.lateNights],
    ['Mood check-ins', list(p.moodCheckIns, MOOD)],
    ['Worry themes (no words)', list(p.worryThemes, THEME)],
    ['Low moments', p.lowFeelings],
    ['Times support contacts were shown', p.supportShown],
    ['Reminders shown / done / snoozed', `${p.reminders.shown} / ${p.reminders.done} / ${p.reminders.snoozed}`],
    ['Breaks with real time away', p.reminders.away],
    ['Calls', `${p.calls.count} (${p.calls.minutes} min)`],
    ['Features used', list(p.features, FEATURE)],
    ['Answer to the weekly question', p.answer && v.question && v.question.id === p.answer.q ? v.question.options[p.answer.a] : p.answer ? `Option ${p.answer.a + 1}` : 'None'],
  ] : [['Nothing', 'Adding to team totals is off']];
  $('preview').tBodies[0].replaceChildren(...rows.map(([k, val]) => {
    const tr = document.createElement('tr');
    const a = document.createElement('td'); a.textContent = k;
    const b = document.createElement('td'); b.textContent = String(val); b.style.whiteSpace = 'pre-line';
    tr.append(a, b);
    return tr;
  }));
}

const JOIN_ERRORS = {
  'unknown-code': "That code didn't match a company. Check it with your HR or IT team.",
  'not-company-laptop': 'Your company has Mochi for Teams on work laptops only. Try again on your work laptop, signed in with your work account.',
  offline: "Mochi couldn't reach the internet just now. Check your connection and try again.",
  server: 'Something went wrong on our side. Please try again in a few minutes.',
};

let last = null;
const show = (v) => { last = v; render(v); };

$('join-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('join-btn');
  const msg = $('join-msg');
  btn.disabled = true;
  msg.className = 'note';
  msg.textContent = 'Checking…';
  const r = await window.teams.join($('code').value);
  btn.disabled = false;
  msg.className = 'note' + (r.ok ? '' : ' err');
  msg.textContent = r.ok ? '' : JOIN_ERRORS[r.reason] || JOIN_ERRORS['unknown-code'];
});
$('team').addEventListener('change', (e) => window.teams.set({ team: e.target.value }));
$('insights').addEventListener('change', (e) => window.teams.set({ insights: e.target.checked }));
$('leave').addEventListener('click', () => window.teams.leave());

$('consent-yes').addEventListener('click', () => window.teams.set({ insights: true }));
$('consent-no').addEventListener('click', () => window.teams.set({ insights: false }));
$('privacy-btn').addEventListener('click', () => { privacyOpen = !privacyOpen; if (last) render(last); });

window.teams.onChange(show);
window.teams.get().then(show);
