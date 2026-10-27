// The three things the Mochi for Teams server does, written so they can run
// in a Supabase Edge Function (Deno) and in the tests (Bun) alike. Each one
// takes a `postgres` sql tag and returns { status, body }.
import { pulseData } from './pulse.ts';

export const GRACE_DAYS = 45; // the app keeps company features this long without a check-in
const KEEP_WEEKS = 12;        // weeks shown in Pulse

// deno-lint-ignore no-explicit-any
type Sql = any;
type Out = { status: number; body: Record<string, unknown> };

const ok = (body: Record<string, unknown>): Out => ({ status: 200, body: { ok: true, ...body } });
const no = (status: number, reason: string): Out => ({ status, body: { ok: false, reason } });

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const str = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
export const normCode = (v: unknown) => str(v, 40).toUpperCase().replace(/\s+/g, '');
const day = (d: Date) => d.toISOString().slice(0, 10);

// Monday of the week `d` falls in, as YYYY-MM-DD (UTC).
export function mondayOf(d: Date) {
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  m.setUTCDate(m.getUTCDate() - ((m.getUTCDay() + 6) % 7));
  return day(m);
}

async function companyFor(sql: Sql, code: string, today: Date) {
  if (!/^[A-Z0-9-]{6,40}$/.test(code)) return null;
  const [c] = await sql`
    select * from companies
    where active and (code = ${code} or (old_code = ${code} and old_code_until >= ${day(today)}))`;
  return c || null;
}

// The company-laptop lock: if the company set an Entra tenant or a domain,
// the laptop must be joined to one of them.
export function lockPasses(c: { tenant_id?: string | null; domain?: string | null }, tenant: unknown, domain: unknown) {
  const t = str(tenant, 60).toLowerCase(), d = str(domain, 120).toLowerCase();
  if (!c.tenant_id && !c.domain) return true;
  if (c.tenant_id && t && t === String(c.tenant_id).toLowerCase()) return true;
  if (c.domain && d && d === String(c.domain).toLowerCase()) return true;
  return false;
}

// A laptop says it is still in use. Counts one seat for the month and hands
// back the company's current settings.
// deno-lint-ignore no-explicit-any
export async function checkin(sql: Sql, pepper: string, body: any, today = new Date()): Promise<Out> {
  const code = normCode(body?.code);
  const install = str(body?.install, 64).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(install)) return no(400, 'bad-install');
  const c = await companyFor(sql, code, today);
  if (!c) return no(404, 'unknown-code');
  if (!lockPasses(c, body?.tenant, body?.domain)) return no(403, 'not-company-laptop');
  const month = day(today).slice(0, 8) + '01';
  const seat = await sha256(`${pepper}:${c.id}:${install}`);
  await sql`insert into seats (company_id, month, install) values (${c.id}, ${month}, ${seat}) on conflict do nothing`;
  const locked = !!(c.tenant_id || c.domain);
  return ok({
    company: {
      id: c.id,
      name: c.name,
      // A laptop that passed the lock moves to a new code by itself. Without
      // a lock, IT pushes the new code, so a leaked one stops working.
      code: locked ? c.code : code,
      welcome: c.welcome,
      support: Array.isArray(c.support) ? c.support.slice(0, 4) : [],
      posh: c.posh || null,
      teams: Array.isArray(c.teams) ? c.teams.slice(0, 60) : [],
    },
    graceDays: GRACE_DAYS,
  });
}

// Only these fields, as small whole numbers, are ever stored.
const n = (v: unknown, max = 10_000) => { const x = Math.round(Number(v)); return Number.isFinite(x) && x > 0 ? Math.min(x, max) : 0; };
const pick = (o: unknown, keys: string[], max?: number) =>
  Object.fromEntries(keys.map((k) => [k, n((o as Record<string, unknown>)?.[k], max)]).filter(([, v]) => v));
const THEMES = ['deadline', 'work', 'study', 'money', 'people', 'health', 'self', 'future', 'general'];
const FEATURES = ['feed', 'pet', 'breathe', 'bubble', 'chase', 'worry', 'focus', 'mood', 'gratitude', 'win'];

// deno-lint-ignore no-explicit-any
export function cleanPacket(p: any) {
  const r = p?.reminders || {}, calls = p?.calls || {};
  return {
    activeDays: n(p?.activeDays, 7),
    lateNights: n(p?.lateNights, 7),
    moodCheckIns: pick(p?.moodCheckIns, ['1', '2', '3', '4', '5'], 500),
    worryThemes: pick(p?.worryThemes, THEMES, 500),
    lowFeelings: n(p?.lowFeelings, 500),
    supportShown: n(p?.supportShown, 500),
    reminders: { shown: n(r.shown, 2000), done: n(r.done, 2000), away: n(r.away, 2000), snoozed: n(r.snoozed, 2000) },
    calls: { count: n(calls.count, 500), minutes: n(calls.minutes, 7 * 24 * 60) },
    features: pick(p?.features, FEATURES, 2000),
  };
}

// One laptop's counts for one finished week. No install id is sent or kept.
// deno-lint-ignore no-explicit-any
export async function totals(sql: Sql, body: any, today = new Date()): Promise<Out> {
  const c = await companyFor(sql, normCode(body?.code), today);
  if (!c) return no(404, 'unknown-code');
  const week = str(body?.week, 10);
  const thisWeek = mondayOf(today);
  const oldest = mondayOf(new Date(today.getTime() - 8 * 7 * 864e5));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || mondayOf(new Date(week + 'T00:00:00Z')) !== week || week >= thisWeek || week < oldest) {
    return no(400, 'bad-week');
  }
  const teams: string[] = Array.isArray(c.teams) ? c.teams : [];
  const team = teams.includes(body?.team) ? body.team : null;
  await sql`insert into packets (company_id, team, week, data) values (${c.id}, ${team}, ${week}, ${sql.json(cleanPacket(body?.packet))})`;
  return ok({});
}

// HR opens Mochi Pulse with their key.
export async function pulse(sql: Sql, key: unknown, today = new Date()): Promise<Out> {
  const k = str(key, 100);
  if (k.length < 24) return no(401, 'bad-key');
  const [row] = await sql`
    select c.* from pulse_keys k join companies c on c.id = k.company_id
    where k.key_hash = ${await sha256(k)} and not k.revoked and c.active`;
  if (!row) return no(401, 'bad-key');
  await sql`update pulse_keys set last_used = ${day(today)} where key_hash = ${await sha256(k)}`;

  const thisWeek = mondayOf(today);
  const weeks: string[] = [];
  for (let i = KEEP_WEEKS; i >= 1; i--) weeks.push(mondayOf(new Date(new Date(thisWeek + 'T00:00:00Z').getTime() - i * 7 * 864e5)));
  const packets = await sql`
    select team, to_char(week, 'YYYY-MM-DD') as week, data from packets
    where company_id = ${row.id} and week >= ${weeks[0]} and week < ${thisWeek}`;
  const seats = await sql`
    select to_char(month, 'YYYY-MM') as month, count(*)::int as active from seats
    where company_id = ${row.id} group by month order by month desc limit 6`;
  return ok({
    pulse: pulseData({ name: row.name, teams: Array.isArray(row.teams) ? row.teams : [] }, [...packets], weeks),
    seats: { committed: row.seats, months: [...seats] },
  });
}
