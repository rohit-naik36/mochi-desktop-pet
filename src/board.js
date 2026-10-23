// Achievement board: points, level, streak, badges, mood week, activity
// counts and the gratitude jar. Read-only; it refreshes when state changes.
let S = null;
const $ = (id) => document.getElementById(id);
const T = (key, extra = {}) => window.I18N.t(S.lang || 'en', key, { name: S.userName, pet: S.name, gender: S.petGender, ...extra });
const MOOD_FACES = ['', '😞', '🙁', '😐', '🙂', '😄'];
const MOOD_COLORS = ['', '#6f7fb8', '#8a90c4', '#b9b38a', '#e6c46b', '#ffb36b'];
const P = window.Progress;

function render() {
  const st = S.stats || P.fresh();
  document.body.dataset.skin = S.skin || 'smoke';
  document.title = T('board.title');
  $('title').textContent = T('board.title');

  const lv = P.level(st.points);
  const lo = P.levelFloor(lv), hi = P.levelFloor(lv + 1);
  $('level').textContent = T('board.level', { count: lv });
  $('points').textContent = `⭐ ${st.points} ${T('board.points')}`;
  $('bar-fill').style.width = Math.round(((st.points - lo) / (hi - lo)) * 100) + '%';
  $('to-next').textContent = T('board.toNext', { count: hi - st.points });
  $('streak-n').textContent = P.streak(st.days);
  $('streak-label').textContent = T('board.streak');

  // Badges: earned ones first, then the closest to being earned.
  $('badges-title').textContent = T('board.badges');
  $('badges-earned').textContent = '· ' + T('board.earned', { count: st.unlocked.length }) + ` / ${P.ACHIEVEMENTS.length}`;
  const ratio = (a) => Math.min(1, P.progressOf(st, a) / a.goal);
  const list = [...P.ACHIEVEMENTS].sort((a, b) => (st.unlocked.includes(b.id) - st.unlocked.includes(a.id)) || ratio(b) - ratio(a));
  $('badges').innerHTML = '';
  for (const a of list) {
    const earned = st.unlocked.includes(a.id);
    const el = document.createElement('div');
    el.className = 'badge ' + (earned ? 'earned' : 'locked');
    el.innerHTML = '<div class="e"></div><div class="n"></div><div class="d"></div>';
    el.querySelector('.e').textContent = a.emoji;
    el.querySelector('.n').textContent = T('badges.' + a.id + '.name');
    el.querySelector('.d').textContent = T('badges.' + a.id + '.desc');
    if (!earned) {
      const bar = document.createElement('div');
      bar.className = 'p';
      bar.innerHTML = '<i></i>';
      bar.firstChild.style.width = Math.round(ratio(a) * 100) + '%';
      bar.title = `${Math.min(P.progressOf(st, a), a.goal)} / ${a.goal}`;
      el.appendChild(bar);
    }
    $('badges').appendChild(el);
  }

  // Last 7 days of mood check-ins.
  $('mood-title').textContent = T('board.moodWeek');
  const week = $('mood-week');
  week.innerHTML = '';
  const moods = S.moods || {};
  const days = (window.I18N.STRINGS[S.lang] || window.I18N.STRINGS.en).board.days; // a list, not a random pick
  let any = false;
  for (let i = 6; i >= 0; i--) {
    const t = Date.now() - i * 86_400_000;
    const m = moods[P.dayKey(t)] || 0;
    if (m) any = true;
    const d = document.createElement('div');
    d.className = 'mood-day' + (i === 0 ? ' today' : '');
    d.innerHTML = '<div class="face"></div><div class="col"></div><div class="lbl"></div>';
    d.querySelector('.face').textContent = MOOD_FACES[m];
    const col = d.querySelector('.col');
    col.style.height = m ? m * 15 + 'px' : '4px';
    if (m) col.style.background = MOOD_COLORS[m];
    d.querySelector('.lbl').textContent = i === 0 ? T('board.today') : days[new Date(t).getDay()];
    week.appendChild(d);
  }
  if (!any) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.style.gridColumn = '1 / -1';
    empty.textContent = T('board.noMood');
    week.prepend(empty);
  }

  // Counts for everything, all time and today.
  $('activity-title').textContent = T('board.activity');
  $('activity').innerHTML = '';
  const todayCounts = st.today && st.today.day === P.dayKey() ? st.today.counts : {};
  for (const [ev, info] of Object.entries(P.EVENTS)) {
    const row = document.createElement('div');
    row.className = 'act';
    row.innerHTML = '<span class="e"></span><span class="l"></span><span class="v"></span>';
    row.querySelector('.e').textContent = info.emoji;
    row.querySelector('.l').textContent = T('board.events.' + ev);
    row.querySelector('.v').textContent = st.counts[ev] || 0;
    if (todayCounts[ev]) {
      const t = document.createElement('span');
      t.className = 't';
      t.textContent = `+${todayCounts[ev]} ${T('board.today')}`;
      row.querySelector('.v').after(t);
    }
    $('activity').appendChild(row);
  }

  // Gratitude jar.
  const jar = S.gratitude || [];
  $('jar-title').textContent = T('board.jar');
  $('jar-count').textContent = jar.length ? T('board.jarCount', { count: jar.length }) : T('board.jarEmpty');
  $('shake').textContent = T('board.shake');
  $('shake').disabled = !jar.length;
}

$('shake').onclick = () => {
  const jar = S.gratitude || [];
  if (!jar.length) return;
  const j = document.querySelector('.jar');
  j.classList.remove('shaking'); void j.offsetWidth; j.classList.add('shaking');
  const g = jar[Math.floor(Math.random() * jar.length)];
  setTimeout(() => { $('jar-note').textContent = `“${g.t}” · ${g.d}`; }, 350);
};

window.board.getState().then((s) => { S = s; render(); });
window.board.onState((s) => { S = s; render(); });
