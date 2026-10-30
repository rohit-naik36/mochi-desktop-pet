// A sample week of counts for the demo, recorded through the same function the
// real app uses, so the "what is shared" preview looks like a real week. Counts
// only: no words are stored, as with real use.
function seedWeek(store, Insights, now = new Date(), bedtime = 23) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const lastDay = Math.min((now.getDay() + 6) % 7, 4); // Monday to Friday, up to today
  const moods = [3, 4, 2, 4, 5];
  const themes = ['deadline', 'work', 'deadline', 'health', 'future'];
  const calls = [25, 40, 30, 45, 20];
  for (let i = 0; i <= lastDay; i++) {
    const at = (h, m = 0) => { const d = new Date(monday); d.setDate(monday.getDate() + i); d.setHours(h, m, 0, 0); return d; };
    const rec = (kind, value, when) => Insights.record(store, kind, value, when, bedtime);
    rec('mood', moods[i], at(9, 30));
    rec('worry', themes[i], at(11));
    for (const key of ['water', 'eyes']) {
      rec('shown', key, at(10));
      rec('done', key, at(10, 5));
      if (i !== 2) rec('away', key, at(10, 6)); // one day with clicks but no real breaks
    }
    rec('shown', 'stretch', at(15));
    if (i % 2 === 0) { rec('done', 'stretch', at(15, 5)); rec('away', 'stretch', at(15, 6)); } else rec('snoozed', 'stretch', at(15, 5));
    rec('call', calls[i], at(14));
    rec('feature', 'worry', at(11, 5));
    rec('feature', i % 2 ? 'gratitude' : 'breathe', at(16));
    if (i === 1) rec('feature', 'focus', at(13));
    if (i === 1) rec('worry', 'hopeless', at(23, 40)); // a late night, and a moment the support contacts were shown
  }
  return store;
}

module.exports = { seedWeek };
