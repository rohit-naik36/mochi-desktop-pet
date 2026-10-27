// Turns the weekly packets of one company into what Mochi Pulse shows.
// Pure: no database, no clock. The same rules as the app's own preview
// (src/insights.js): a group under MIN_GROUP people is never shown, and
// counts are rounded to the nearest ROUND_TO.

export const MIN_GROUP = 8;
export const ROUND_TO = 5;
export const ALL = 'All teams';

// deno-lint-ignore no-explicit-any
type Packet = { team: string | null; week: string; data: any };

const THEME_NAMES: Record<string, string> = {
  deadline: 'Deadlines and workload', work: 'Work and colleagues', study: 'Studies and exams', money: 'Money',
  people: 'Relationships', health: 'Health and sleep', self: 'Self-doubt', future: 'Future and career', general: 'Something else',
};
const MOODS: [string, number][] = [['great', 5], ['good', 4], ['okay', 3], ['low', 2], ['very_low', 1]];

const round = (n: number) => Math.round(n / ROUND_TO) * ROUND_TO;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
// deno-lint-ignore no-explicit-any
const sum = (o: any) => Object.values(o || {}).reduce((a: number, b) => a + (Number(b) || 0), 0);

// What counts as "used" for the feature chart, from one person's week.
// deno-lint-ignore no-explicit-any
const FEATURES: [string, (d: any) => boolean][] = [
  ['Break reminders', (d) => d.reminders.done > 0],
  ['Real breaks', (d) => d.reminders.away > 0],
  ['Mood check-in', (d) => sum(d.moodCheckIns) > 0],
  ['Worry chat', (d) => (d.features.worry || 0) > 0 || sum(d.worryThemes) + d.lowFeelings + d.supportShown > 0],
  ['Focus timer', (d) => (d.features.focus || 0) > 0],
  ['Breathing exercise', (d) => (d.features.breathe || 0) > 0],
  ['Gratitude jar', (d) => (d.features.gratitude || 0) > 0],
  ['Mini games', (d) => (d.features.bubble || 0) + (d.features.chase || 0) > 0],
  ['Fed or petted Mochi', (d) => (d.features.feed || 0) + (d.features.pet || 0) > 0],
];

function byWeek(packets: Packet[]) {
  const m = new Map<string, Packet[]>();
  for (const p of packets) {
    if (!m.has(p.week)) m.set(p.week, []);
    m.get(p.week)!.push(p);
  }
  return m;
}

// One row of the weekly chart for one group in one week.
function weekRow(week: string, ps: Packet[]) {
  const d = ps.map((p) => p.data);
  const active = d.filter((x) => x.activeDays > 0).length;
  const moods = MOODS.map(([, s]) => d.reduce((a, x) => a + (x.moodCheckIns[s] || 0), 0));
  const checkIns = moods.reduce((a, b) => a + b, 0);
  const moodSum = MOODS.reduce((a, [, s], i) => a + s * moods[i], 0);
  const worry = d.reduce((a, x) => a + sum(x.worryThemes) + x.lowFeelings + x.supportShown, 0);
  const callMin = d.reduce((a, x) => a + x.calls.minutes, 0);
  const shown = d.reduce((a, x) => a + x.reminders.shown, 0);
  return {
    row: {
      week,
      active: round(active),
      enrolled: round(d.length),
      avg_mood: checkIns ? r2(moodSum / checkIns) : null,
      check_ins: round(checkIns),
      breaks_prompted: round(shown),
      breaks_taken: round(d.reduce((a, x) => a + x.reminders.done, 0)),
      breaks_away: round(d.reduce((a, x) => a + x.reminders.away, 0)),
      focus_sessions: round(d.reduce((a, x) => a + (x.features.focus || 0), 0)),
      late_night_share: active ? r3(d.filter((x) => x.lateNights > 0).length / active) : 0,
      worry_chats: round(worry),
      support_shown: round(d.reduce((a, x) => a + x.supportShown, 0)),
      call_hours_per_person: active ? Math.round(callMin / 60 / active * 10) / 10 : 0,
    },
    emotions: { week, ...Object.fromEntries(MOODS.map(([k], i) => [k, checkIns ? r3(moods[i] / checkIns) : 0])) },
  };
}

function themeShares(ps: Packet[]) {
  const out: Record<string, number> = {};
  for (const p of ps) for (const [k, v] of Object.entries(p.data.worryThemes || {})) out[k] = (out[k] || 0) + Number(v);
  const total = sum(out);
  return { out, total };
}

// Everything Pulse needs for one group of packets (a team, or everyone).
function scope(packets: Packet[], weeks: string[]) {
  const wk = byWeek(packets);
  const shown = weeks.filter((w) => (wk.get(w) || []).length >= MIN_GROUP);
  const rows = shown.map((w) => weekRow(w, wk.get(w)!));
  const first = shown.slice(0, 4).flatMap((w) => wk.get(w)!);
  const last = shown.slice(-4).flatMap((w) => wk.get(w)!);
  const a = themeShares(first), b = themeShares(last);
  const themes = Object.keys(THEME_NAMES)
    .filter((k) => a.out[k] || b.out[k])
    .map((k) => ({ theme: THEME_NAMES[k], first_month: a.total ? r3((a.out[k] || 0) / a.total) : 0, last_month: b.total ? r3((b.out[k] || 0) / b.total) : 0 }))
    .sort((x, y) => y.last_month - x.last_month);
  const features = last.length
    ? FEATURES.map(([feature, used]) => ({ feature, users: r2(last.filter((p) => used(p.data)).length / last.length) }))
    : [];
  // A week with no mood check-ins takes the nearest week's average, so the
  // mood line doesn't drop to zero.
  const weekly = rows.map((r) => r.row);
  for (let i = 0; i < weekly.length; i++) {
    if (weekly[i].avg_mood != null) continue;
    const near = [...weekly.slice(0, i).reverse(), ...weekly.slice(i + 1)].find((w) => w.avg_mood != null);
    weekly[i].avg_mood = near ? near.avg_mood : 3;
  }
  return { weekly, emotions: rows.map((r) => r.emotions), themes, features };
}

// packets: this company's rows for the weeks to show (oldest first).
export function pulseData(company: { name: string; teams: string[] }, packets: Packet[], weeks: string[]) {
  const teamNames = [...new Set([...(company.teams || []), ...packets.map((p) => p.team).filter(Boolean) as string[]])];
  const teams = teamNames.map((team) => {
    const wk = byWeek(packets.filter((p) => p.team === team));
    const people = Math.max(0, ...[...wk.values()].map((x) => x.length));
    return { team, people: round(people), hidden: people < MIN_GROUP };
  }).filter((t) => t.people > 0 || !t.hidden);

  const out = { company: company.name, sample: false, minGroup: MIN_GROUP, weeks, teams,
    weekly: {} as Record<string, unknown>, emotions: {} as Record<string, unknown>, themes: {} as Record<string, unknown>, features: {} as Record<string, unknown> };
  const groups: [string, Packet[]][] = [[ALL, packets], ...teams.filter((t) => !t.hidden).map((t) => [t.team, packets.filter((p) => p.team === t.team)] as [string, Packet[]])];
  for (const [name, ps] of groups) {
    const s = scope(ps, weeks);
    if (!s.weekly.length) continue;
    out.weekly[name] = s.weekly;
    out.emotions[name] = s.emotions;
    out.themes[name] = s.themes;
    out.features[name] = s.features;
  }
  // Only weeks that have something to show.
  out.weeks = ((out.weekly[ALL] || []) as { week: string }[]).map((r) => r.week);
  return out;
}
