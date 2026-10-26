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

function render(v) {
  const co = v.company;
  $('join').classList.toggle('hidden', !!co);
  $('joined').classList.toggle('hidden', !co);
  $('min-group').textContent = v.minGroup;
  $('round-to').textContent = v.roundTo;
  if (!co) return;
  $('co-name').textContent = co.name;
  $('co-demo').classList.toggle('hidden', !co.demo);
  $('co-support').replaceChildren(...[...co.support, co.posh].filter(Boolean).map(contactLine));
  const sel = $('team');
  sel.replaceChildren(new Option('Choose your team', ''));
  for (const t of co.teams) sel.append(new Option(t, t));
  sel.value = co.team || '';
  $('insights').checked = !!co.insights;

  const p = v.packet;
  const on = !!co.insights;
  $('preview-off').classList.toggle('hidden', on);
  $('preview').classList.toggle('hidden', !on);
  if (!on) return;
  const rows = [
    ['Company', co.name],
    ['Team', p.team || 'Not chosen yet'],
    ['Week starting', p.week],
    ['Days you used Mochi', p.activeDays],
    ['Days used after bedtime', p.lateNights],
    ['Mood check-ins', list(p.moodCheckIns, MOOD)],
    ['Worry themes (no words)', list(p.worryThemes, THEME)],
    ['Low moments', p.lowFeelings],
    ['Times support contacts were shown', p.supportShown],
    ['Reminders shown / done / snoozed', `${p.reminders.shown} / ${p.reminders.done} / ${p.reminders.snoozed}`],
    ['Breaks with real time away from the keyboard', p.reminders.away],
    ['Calls (count, total minutes)', `${p.calls.count}, ${p.calls.minutes} min`],
    ['Features used', list(p.features, FEATURE)],
  ];
  $('preview').tBodies[0].replaceChildren(...rows.map(([k, val]) => {
    const tr = document.createElement('tr');
    const a = document.createElement('td'); a.textContent = k;
    const b = document.createElement('td'); b.textContent = String(val); b.style.whiteSpace = 'pre-line';
    tr.append(a, b);
    return tr;
  }));
}

$('join-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await window.teams.join($('code').value);
  const msg = $('join-msg');
  msg.className = 'note' + (r.ok ? '' : ' err');
  msg.textContent = r.ok ? '' : "That code didn't match a company. Check it with your HR or IT team.";
});
$('team').addEventListener('change', (e) => window.teams.set({ team: e.target.value }));
$('insights').addEventListener('change', (e) => window.teams.set({ insights: e.target.checked }));
$('leave').addEventListener('click', () => window.teams.leave());

window.teams.onChange(render);
window.teams.get().then(render);
