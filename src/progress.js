// Points, levels, streaks and achievements. Pure functions, used by the main
// process (to record) and by the board window (to show).
(function (root) {
  // Points per activity, and how many of each count towards points per day,
  // so petting 500 times doesn't break the game.
  const EVENTS = {
    feed: { points: 2, dailyCap: 10, emoji: '🍙' },
    pet: { points: 1, dailyCap: 20, emoji: '💛' },
    water: { points: 10, dailyCap: 12, emoji: '💧' },
    stretch: { points: 10, dailyCap: 10, emoji: '🙆' },
    eyes: { points: 5, dailyCap: 20, emoji: '👀' },
    breathe: { points: 15, dailyCap: 6, emoji: '🌬️' },
    bubble: { points: 1, dailyCap: 60, emoji: '🫧' },
    chase: { points: 2, dailyCap: 25, emoji: '✨' },
    worry: { points: 8, dailyCap: 10, emoji: '🍃' },
    focus: { points: 25, dailyCap: 12, emoji: '🛡️' },
    mood: { points: 5, dailyCap: 1, emoji: '🌤️' },
    gratitude: { points: 10, dailyCap: 3, emoji: '🫙' },
  };

  // Badges. `event` is what's counted ('streak' = days in a row, 'level' = level).
  const ACHIEVEMENTS = [
    { id: 'firstSnack', event: 'feed', goal: 1, emoji: '🍙' },
    { id: 'snackMaster', event: 'feed', goal: 50, emoji: '🍱' },
    { id: 'bestFriends', event: 'pet', goal: 100, emoji: '💛' },
    { id: 'hydro', event: 'water', goal: 10, emoji: '💧' },
    { id: 'ocean', event: 'water', goal: 100, emoji: '🌊' },
    { id: 'stretchy', event: 'stretch', goal: 10, emoji: '🙆' },
    { id: 'yogi', event: 'stretch', goal: 50, emoji: '🧘' },
    { id: 'eagleEyes', event: 'eyes', goal: 25, emoji: '👀' },
    { id: 'calm', event: 'breathe', goal: 5, emoji: '🌬️' },
    { id: 'zen', event: 'breathe', goal: 30, emoji: '🪷' },
    { id: 'bubbleWrap', event: 'bubble', goal: 200, emoji: '🫧' },
    { id: 'bubbleLord', event: 'bubble', goal: 1000, emoji: '👑' },
    { id: 'lightCatcher', event: 'chase', goal: 50, emoji: '✨' },
    { id: 'firstWorry', event: 'worry', goal: 1, emoji: '🍃' },
    { id: 'worryEater', event: 'worry', goal: 25, emoji: '🍂' },
    { id: 'firstFocus', event: 'focus', goal: 1, emoji: '🛡️' },
    { id: 'deepWork', event: 'focus', goal: 10, emoji: '🎯' },
    { id: 'focusLegend', event: 'focus', goal: 50, emoji: '🏔️' },
    { id: 'moodDiary', event: 'mood', goal: 7, emoji: '📔' },
    { id: 'thankful', event: 'gratitude', goal: 1, emoji: '🫙' },
    { id: 'gratefulHeart', event: 'gratitude', goal: 30, emoji: '🌻' },
    { id: 'streak3', event: 'streak', goal: 3, emoji: '🔥' },
    { id: 'streak7', event: 'streak', goal: 7, emoji: '☄️' },
    { id: 'streak30', event: 'streak', goal: 30, emoji: '🌟' },
    { id: 'level5', event: 'level', goal: 5, emoji: '🏅' },
    { id: 'level10', event: 'level', goal: 10, emoji: '🏆' },
  ];

  const dayKey = (t = Date.now()) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function fresh() {
    return { points: 0, counts: {}, today: { day: dayKey(), counts: {} }, days: [], unlocked: [] };
  }

  // Level n needs 50 * (n-1)^2 points: 0, 50, 200, 450, 800...
  const level = (points) => Math.floor(Math.sqrt(points / 50)) + 1;
  const levelFloor = (lv) => 50 * (lv - 1) ** 2;

  // Days in a row with any activity, ending today (or yesterday, so the
  // streak doesn't look broken first thing in the morning).
  function streak(days, now = Date.now()) {
    const set = new Set(days);
    let t = now;
    if (!set.has(dayKey(t))) t -= 86_400_000;
    let n = 0;
    while (set.has(dayKey(t))) { n++; t -= 86_400_000; }
    return n;
  }

  function progressOf(stats, a) {
    if (a.event === 'streak') return streak(stats.days);
    if (a.event === 'level') return level(stats.points);
    return stats.counts[a.event] || 0;
  }

  // Record an activity. Returns the ids of any badges it unlocked.
  function record(stats, event, n = 1, now = Date.now()) {
    const ev = EVENTS[event];
    if (!ev || n <= 0) return [];
    const today = dayKey(now);
    if (stats.today.day !== today) stats.today = { day: today, counts: {} };
    const before = stats.today.counts[event] || 0;
    const counted = Math.max(0, Math.min(n, ev.dailyCap - before));
    stats.today.counts[event] = before + n;
    stats.counts[event] = (stats.counts[event] || 0) + n;
    stats.points += counted * ev.points;
    if (!stats.days.includes(today)) stats.days = [...stats.days, today].slice(-120);
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (stats.unlocked.includes(a.id)) continue;
      if (progressOf(stats, a) >= a.goal) { stats.unlocked.push(a.id); fresh.push(a.id); }
    }
    return fresh;
  }

  root.Progress = { EVENTS, ACHIEVEMENTS, fresh, record, level, levelFloor, streak, progressOf, dayKey };
  if (typeof module !== 'undefined') module.exports = root.Progress;
})(typeof window !== 'undefined' ? window : globalThis);
