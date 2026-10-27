// A small stand-in for the dashboard runtime the Pulse page was written
// for: named datasets, calculations over them and a redraw callback. Here
// the data comes from the company's team totals (sample data for now) and
// every dataset follows the team picked at the top.
(function () {
  const S = window.PULSE_SAMPLE;
  const calcs = {}, fns = [];
  window.PULSE_SCOPE = 'All teams';

  const mean = (rs, f) => rs.reduce((s, r) => s + Number(r[f]), 0) / rs.length;
  const sum = (rs, f) => rs.reduce((s, r) => s + Number(r[f]), 0);

  // One row per team, last 4 weeks against the first 4.
  function teamRows() {
    return S.teams.map((t) => {
      if (t.hidden) return { team: t.team, people: t.people, hidden: true };
      const w = S.weekly[t.team], first = w.slice(0, 4), last = w.slice(-4);
      const th = S.themes[t.team].slice().sort((a, b) => b.last_month - a.last_month)[0];
      return {
        team: t.team, people: t.people, hidden: false,
        active_share: Math.round(mean(last, 'active') / t.people * 100) / 100,
        avg_mood: Math.round(mean(last, 'avg_mood') * 100) / 100,
        mood_change: Math.round((mean(last, 'avg_mood') - mean(first, 'avg_mood')) * 100) / 100,
        late_night_share: Math.round(mean(last, 'late_night_share') * 100) / 100,
        breaks_skipped: Math.round((1 - sum(last, 'breaks_taken') / sum(last, 'breaks_prompted')) * 100) / 100,
        top_theme: th.theme,
      };
    });
  }

  function raw(id) {
    const scope = window.PULSE_SCOPE;
    if (id === 'teams_all') return teamRows();
    if (id === 'teams') return teamRows().filter((t) => scope === 'All teams' || t.team === scope);
    if (S[id] && S[id][scope]) return S[id][scope];
    if (calcs[id]) return calcs[id].fn(...calcs[id].inputs.map(raw));
    return null;
  }

  window.dash = {
    colors: ['#4f7cff', '#ff8a3d', '#8b5cf6', '#14a3a3', '#e0559b', '#7aa83c', '#c9a227', '#6b7a99'],
    calc(id, opts) { calcs[id] = opts; },
    data(id) {
      try {
        const d = raw(id);
        return d ? { status: 'ok', data: d } : { status: 'missing', data: [] };
      } catch (e) {
        console.error(id, e);
        return { status: 'error', data: [], message: String(e) };
      }
    },
    onData(fn) { fns.push(fn); fn(); },
    redraw() { for (const fn of fns) fn(); },
  };

  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(window.dash.redraw, 120); });
})();
