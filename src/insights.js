// Mochi for Teams: anonymous insights, worked out on this computer.
// Only counts are kept: a mood score, a worry's theme id, a reminder that was
// shown or done. Never the words someone typed, never a timestamp finer than
// the week. Pure functions, used by the main process (to record) and by the
// Teams window (to preview what would be shared).
(function (root) {
  const KEEP_WEEKS = 8;
  const ROUND_TO = 5; // team totals are rounded, so one person can't be picked out
  const MIN_GROUP = 8; // smaller groups are never shown

  // Worry themes HR may see as totals. Crisis, harm and feelings are never
  // sent as themes: they only add to "support contacts shown".
  const THEMES = ['deadline', 'work', 'study', 'money', 'people', 'health', 'self', 'future', 'general'];
  const SUPPORT = ['crisis', 'harm', 'hopeless'];
  const FEATURES = ['feed', 'pet', 'breathe', 'bubble', 'chase', 'worry', 'focus', 'mood', 'gratitude', 'win'];
  const NUDGES = ['water', 'stretch', 'eyes'];

  // Monday of this week, local time, as 'YYYY-MM-DD'.
  function weekKey(d = new Date()) {
    const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    const p = (n) => String(n).padStart(2, '0');
    return `${m.getFullYear()}-${p(m.getMonth() + 1)}-${p(m.getDate())}`;
  }

  function blank() {
    return { days: [], late: [], moods: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, themes: {}, low: 0, support: 0, shown: {}, done: {}, snoozed: {}, away: {}, features: {}, calls: 0, callMin: 0 };
  }

  function week(store, d) {
    const k = weekKey(d);
    store.weeks = store.weeks || {};
    if (!store.weeks[k]) {
      store.weeks[k] = blank();
      const keys = Object.keys(store.weeks).sort();
      for (const old of keys.slice(0, Math.max(0, keys.length - KEEP_WEEKS))) delete store.weeks[old];
    }
    store.weeks[k] = Object.assign(blank(), store.weeks[k]); // weeks saved before new fields existed
    return store.weeks[k];
  }

  // Bedtime is the person's own (state.bedtime, an hour); late means after it
  // and before 5 am.
  function isLate(d, bedtime = 23) {
    if (bedtime == null) return false; // night shift: late is their normal
    const h = d.getHours();
    if (bedtime === 0) return h < 5;
    return h >= bedtime || h < 5;
  }

  // kind: 'mood' | 'worry' | 'shown' | 'done' | 'snoozed' | 'away' | 'feature' | 'call'
  // value: a mood 1-5, a worry topic id, a reminder key, a feature name, or a
  // call's length in minutes. 'away' means the keyboard and mouse really went
  // quiet after "Done" on a break.
  // Anything else is ignored, so free text can never end up stored here.
  function record(store, kind, value, d = new Date(), bedtime = 23) {
    const w = week(store, d);
    const day = (d.getDay() + 6) % 7;
    if (!w.days.includes(day)) w.days.push(day);
    if (isLate(d, bedtime) && !w.late.includes(day)) w.late.push(day);
    if (kind === 'mood') {
      const s = Math.round(Number(value));
      if (s >= 1 && s <= 5) w.moods[s] += 1;
    } else if (kind === 'worry') {
      if (THEMES.includes(value)) w.themes[value] = (w.themes[value] || 0) + 1;
      else if (value === 'low') w.low += 1;
      else if (SUPPORT.includes(value)) { w.support += 1; if (value === 'hopeless') w.low += 1; }
    } else if (kind === 'call') {
      const m = Math.round(Number(value));
      if (m > 0 && m < 24 * 60) { w.calls += 1; w.callMin += m; }
    } else if (kind === 'shown' || kind === 'done' || kind === 'snoozed' || kind === 'away') {
      if (NUDGES.includes(value)) w[kind][value] = (w[kind][value] || 0) + 1;
    } else if (kind === 'feature') {
      if (FEATURES.includes(value)) w.features[value] = (w.features[value] || 0) + 1;
    }
    return store;
  }

  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);

  // Exactly what this laptop would send for one week: counts only, with days
  // as a number rather than dates. No name, email or device id.
  function packet(store, company, wk = weekKey()) {
    const w = (store.weeks || {})[wk] || blank();
    return {
      company: company ? company.id : null,
      team: company ? company.team || null : null,
      week: wk,
      activeDays: w.days.length,
      lateNights: w.late.length,
      moodCheckIns: { ...w.moods },
      worryThemes: { ...w.themes },
      lowFeelings: w.low,
      supportShown: w.support,
      reminders: { shown: sum(w.shown), done: sum(w.done), away: sum(w.away), snoozed: sum(w.snoozed) },
      calls: { count: w.calls, minutes: w.callMin },
      features: { ...w.features },
    };
  }

  // How a team's packets become what HR sees: nothing for a group under
  // MIN_GROUP people, and every total rounded to the nearest ROUND_TO.
  function teamTotals(packets) {
    if (!packets || packets.length < MIN_GROUP) return null;
    const round = (n) => Math.round(n / ROUND_TO) * ROUND_TO;
    const add = (key) => {
      const out = {};
      for (const p of packets) for (const [k, v] of Object.entries(p[key] || {})) out[k] = (out[k] || 0) + v;
      return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, round(v)]));
    };
    const total = (f) => round(packets.reduce((a, p) => a + f(p), 0));
    return {
      people: round(packets.length),
      active: total((p) => (p.activeDays > 0 ? 1 : 0)),
      lateNightPeople: total((p) => (p.lateNights > 0 ? 1 : 0)),
      moodCheckIns: add('moodCheckIns'),
      worryThemes: add('worryThemes'),
      lowFeelings: total((p) => p.lowFeelings),
      supportShown: total((p) => p.supportShown),
      reminders: add('reminders'),
      features: add('features'),
      calls: add('calls'),
    };
  }

  root.Insights = { record, packet, teamTotals, weekKey, isLate, THEMES, FEATURES, NUDGES, ROUND_TO, MIN_GROUP, KEEP_WEEKS };
  if (typeof module !== 'undefined') module.exports = root.Insights;
})(typeof window !== 'undefined' ? window : globalThis);
