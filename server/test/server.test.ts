// bun test, with a throwaway Postgres in TEST_DATABASE_URL
// (for example postgres://postgres@localhost:5432/postgres).
import { afterAll, beforeAll, expect, test } from 'bun:test';
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { checkin, totals, pulse, sha256, lockPasses, cleanPacket, cleanAnswer, mondayOf } from '../supabase/functions/_shared/core.ts';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Set TEST_DATABASE_URL to a throwaway Postgres database');
const admin = postgres(url, { onnotice: () => {} });
const DB = 'mochi_test_' + process.pid;
let sql: ReturnType<typeof postgres>;

const TODAY = new Date('2026-11-18T10:00:00Z'); // a Wednesday
const INSTALL = 'a'.repeat(64);
const KEY = 'pulse-key-for-tests-0123456789abcdef';

beforeAll(async () => {
  await admin.unsafe(`create database ${DB}`);
  const u = new URL(url); u.pathname = '/' + DB;
  sql = postgres(u.toString(), { onnotice: () => {} });
  for (const m of readdirSync(new URL('../supabase/migrations/', import.meta.url)).sort()) {
    await sql.unsafe(readFileSync(new URL('../supabase/migrations/' + m, import.meta.url), 'utf8'));
  }
  await sql`insert into companies (id, name, code, old_code, old_code_until, seats, welcome, support, posh, teams)
    values ('acme', 'Acme Pvt Ltd', 'ACME-2026', 'ACME-OLD1', '2026-11-30', 50, 'Welcome!',
      ${sql.json([{ name: 'Acme EAP', number: '1800-111' }])}, ${sql.json({ name: 'POSH', number: 'ic@acme.com' })},
      ${sql.json(['Engineering', 'Sales', 'Legal'])})`;
  await sql`update companies set
    campaigns = ${sql.json([
      { id: 'water-nov', theme: 'hydration', start: '2026-11-16', end: '2026-11-20', note: 'Free fruit at the pantry!' },
      { id: 'old', theme: 'sleep', start: '2026-10-01', end: '2026-10-05' },
      { id: 'made-up', theme: 'crypto-tips', start: '2026-11-16', end: '2026-11-20' },
    ])},
    questions = ${sql.json([
      { id: 'workload-1', text: 'How manageable was your workload this week?', options: ['Very', 'Mostly', 'Not really', 'Not at all'], start: '2026-11-02', end: '2026-11-22' },
      { id: 'one-option', text: 'Bad question', options: ['Only'], start: '2026-11-02', end: '2026-11-22' },
    ])}
    where id = 'acme'`;
  await sql`insert into companies (id, name, code, tenant_id, domain, teams) values ('locked', 'Locked Ltd', 'LOCK-2026', 'TENANT-1', 'corp.locked.in', '[]')`;
  await sql`insert into pulse_keys (key_hash, company_id, label) values (${await sha256(KEY)}, 'acme', 'HR head')`;
});

afterAll(async () => {
  await sql.end();
  await admin.unsafe(`drop database ${DB}`);
  await admin.end();
});

test('check-in counts one seat per laptop per month and returns settings', async () => {
  const a = await checkin(sql, 'pepper', { code: 'acme-2026', install: INSTALL }, TODAY);
  expect(a.status).toBe(200);
  expect(a.body.company).toMatchObject({ id: 'acme', name: 'Acme Pvt Ltd', welcome: 'Welcome!', teams: ['Engineering', 'Sales', 'Legal'] });
  await checkin(sql, 'pepper', { code: 'ACME-2026', install: INSTALL }, TODAY); // same laptop again
  await checkin(sql, 'pepper', { code: 'ACME-2026', install: 'b'.repeat(64) }, TODAY);
  const [{ n }] = await sql`select count(*)::int as n from seats where company_id = 'acme' and month = '2026-11-01'`;
  expect(n).toBe(2);
  const [row] = await sql`select install from seats limit 1`;
  expect(row.install).not.toBe(INSTALL); // only a peppered hash is kept
});

test('check-in refuses bad codes, bad ids and expired old codes', async () => {
  expect((await checkin(sql, 'p', { code: 'NOPE-2026', install: INSTALL }, TODAY)).status).toBe(404);
  expect((await checkin(sql, 'p', { code: 'ACME-2026', install: 'xyz' }, TODAY)).status).toBe(400);
  expect((await checkin(sql, 'p', { code: 'ACME-OLD1', install: INSTALL }, TODAY)).status).toBe(200);
  // An unlocked company doesn't hand the new code to someone holding the old one.
  expect(((await checkin(sql, 'p', { code: 'ACME-OLD1', install: INSTALL }, TODAY)).body.company as { code: string }).code).toBe('ACME-OLD1');
  expect((await checkin(sql, 'p', { code: 'ACME-OLD1', install: INSTALL }, new Date('2026-12-01T10:00:00Z'))).status).toBe(404);
});

test('company-laptop lock', async () => {
  expect(lockPasses({}, '', '')).toBe(true);
  expect((await checkin(sql, 'p', { code: 'LOCK-2026', install: INSTALL }, TODAY)).status).toBe(403);
  expect((await checkin(sql, 'p', { code: 'LOCK-2026', install: INSTALL, tenant: 'tenant-1' }, TODAY)).status).toBe(200);
  expect((await checkin(sql, 'p', { code: 'LOCK-2026', install: INSTALL, domain: 'CORP.LOCKED.IN' }, TODAY)).status).toBe(200);
  expect((await checkin(sql, 'p', { code: 'LOCK-2026', install: INSTALL, tenant: 'other' }, TODAY)).status).toBe(403);
});

test('packets keep only known counts', () => {
  const p = cleanPacket({ activeDays: 99, moodCheckIns: { 3: 2, 9: 5 }, worryThemes: { money: 1, 'my boss is awful': 3 }, note: 'hello', reminders: { shown: -4, done: 2 } });
  expect(p.activeDays).toBe(7);
  expect(p.moodCheckIns).toEqual({ 3: 2 });
  expect(p.worryThemes).toEqual({ money: 1 });
  expect(JSON.stringify(p)).not.toContain('hello');
  expect(p.reminders).toEqual({ shown: 0, done: 2, away: 0, snoozed: 0 });
});

test('totals accept only finished, recent weeks', async () => {
  const pk = { activeDays: 3 };
  expect((await totals(sql, { code: 'ACME-2026', week: mondayOf(TODAY), packet: pk }, TODAY)).status).toBe(400); // this week
  expect((await totals(sql, { code: 'ACME-2026', week: '2026-11-10', packet: pk }, TODAY)).status).toBe(400); // a Tuesday
  expect((await totals(sql, { code: 'ACME-2026', week: '2026-08-03', packet: pk }, TODAY)).status).toBe(400); // too old
  expect((await totals(sql, { code: 'WRONG-CODE', week: '2026-11-09', packet: pk }, TODAY)).status).toBe(404);
});

test('Pulse shows groups of 8 or more, rounded, and nothing smaller', async () => {
  const weeks = ['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
  for (const week of weeks) {
    for (let i = 0; i < 12; i++) {
      await totals(sql, { code: 'ACME-2026', team: 'Engineering', week, packet: {
        activeDays: 4, lateNights: i < 3 ? 2 : 0, moodCheckIns: { 4: 1, 2: i % 4 === 0 ? 1 : 0 }, worryThemes: { deadline: 1 },
        reminders: { shown: 10, done: 6, away: 4 }, calls: { count: 5, minutes: 300 }, features: { focus: 2, breathe: 1 },
      } }, TODAY);
    }
    for (let i = 0; i < 5; i++) await totals(sql, { code: 'ACME-2026', team: 'Legal', week, packet: { activeDays: 2, worryThemes: { money: 3 } } }, TODAY);
  }
  await totals(sql, { code: 'ACME-2026', team: 'Not a team', week: weeks[0], packet: { activeDays: 1 } }, TODAY);

  expect((await pulse(sql, 'wrong-key-wrong-key-wrong-key', TODAY)).status).toBe(401);
  const out = await pulse(sql, KEY, TODAY);
  expect(out.status).toBe(200);
  const p = out.body.pulse as any;
  expect(p.weeks).toEqual(weeks);
  expect(p.weeks.at(-1)).toBe('2026-11-09');
  expect(p.teams.find((t: any) => t.team === 'Legal')).toEqual({ team: 'Legal', people: 5, hidden: true });
  expect(p.teams.find((t: any) => t.team === 'Engineering')).toEqual({ team: 'Engineering', people: 10, hidden: false });
  expect(p.weekly.Legal).toBeUndefined();
  const eng = p.weekly.Engineering;
  expect(eng.length).toBe(4);
  expect(eng[0]).toMatchObject({ week: '2026-10-19', active: 10, enrolled: 10, breaks_prompted: 120, breaks_taken: 70, late_night_share: 0.25, call_hours_per_person: 5 });
  for (const r of eng) for (const k of ['active', 'check_ins', 'breaks_away', 'worry_chats']) expect(r[k] % 5).toBe(0);
  // Everyone together includes Legal's 5 people (17 + 1 stray in the first week).
  expect(p.weekly['All teams'][0].enrolled).toBe(20);
  expect(p.themes.Engineering[0]).toEqual({ theme: 'Deadlines and workload', first_month: 1, last_month: 1 });
  expect(p.features.Engineering.find((f: any) => f.feature === 'Focus timer').users).toBe(1);
  expect((out.body.seats as any).committed).toBe(50);
});

test('check-in sends current campaigns and questions, nothing invalid', async () => {
  const c = (await checkin(sql, 'p', { code: 'ACME-2026', install: INSTALL }, TODAY)).body.company as any;
  expect(c.campaigns).toEqual([{ id: 'water-nov', theme: 'hydration', start: '2026-11-16', end: '2026-11-20', note: 'Free fruit at the pantry!' }]);
  expect(c.questions.map((q: any) => q.id)).toEqual(['workload-1']);
});

test('answers are kept only for an open question and a real option', () => {
  const qs = [{ id: 'q1', text: 'How was it?', options: ['Good', 'Bad'], start: '2026-11-09', end: '2026-11-15' }];
  expect(cleanAnswer(qs, '2026-11-09', { q: 'q1', a: 1 })).toEqual({ q: 'q1', a: 1 });
  expect(cleanAnswer(qs, '2026-11-09', { q: 'q1', a: 2 })).toBeNull();
  expect(cleanAnswer(qs, '2026-11-09', { q: 'q1', a: '1' })).toBeNull();
  expect(cleanAnswer(qs, '2026-11-02', { q: 'q1', a: 0 })).toBeNull(); // week before it opened
  expect(cleanAnswer(qs, '2026-11-16', { q: 'q1', a: 0 })).toBeNull(); // week after it closed
  expect(cleanAnswer(qs, '2026-11-09', { q: 'other', a: 0 })).toBeNull();
});

test('Pulse shows question totals for 8 or more answers only', async () => {
  const week = '2026-11-09';
  for (let i = 0; i < 9; i++) {
    await totals(sql, { code: 'ACME-2026', team: 'Sales', week, packet: { activeDays: 1, answer: { q: 'workload-1', a: i < 6 ? 1 : 3 } } }, TODAY);
  }
  for (let i = 0; i < 3; i++) await totals(sql, { code: 'ACME-2026', team: 'Legal', week, packet: { activeDays: 1, answer: { q: 'workload-1', a: 0 } } }, TODAY);
  const p = (await pulse(sql, KEY, TODAY)).body.pulse as any;
  const all = p.questions['All teams'].find((q: any) => q.id === 'workload-1');
  expect(all.answered).toBe(10); // 12 answers, rounded
  expect(all.counts).toEqual([5, 5, 0, 5]);
  expect(p.questions.Sales[0]).toMatchObject({ id: 'workload-1', answered: 10, counts: [0, 5, 0, 5] });
  expect(p.questions.Legal[0]).toMatchObject({ answered: null, counts: null }); // only 3 answers
  expect(p.campaigns.map((c: any) => c.id)).toEqual(['old', 'water-nov']); // past ones too, for reports
  const [row] = await sql`select data from packets where data ? 'answer' limit 1`;
  expect(Object.keys(row.data.answer).sort()).toEqual(['a', 'q']); // nothing else rides along
});

test('totals stop at twice the seats each week', async () => {
  await sql`insert into companies (id, name, code, seats, teams) values ('tiny', 'Tiny LLP', 'TINY-2026', 2, '[]')`;
  const send = () => totals(sql, { code: 'TINY-2026', week: '2026-11-09', packet: { days: 3 } }, TODAY);
  for (let i = 0; i < 4; i++) expect((await send()).status).toBe(200);
  expect((await send()).body).toMatchObject({ ok: false, reason: 'week-full' });
  const other = await totals(sql, { code: 'TINY-2026', week: '2026-11-02', packet: { days: 3 } }, TODAY);
  expect(other.status).toBe(200); // a new week starts fresh
});

test('only the server can run the yearly clean-up', async () => {
  const [{ ok }] = await sql`select has_function_privilege('public', 'prune_packets()', 'execute') as ok`;
  expect(ok).toBe(false);
  await sql`insert into packets (company_id, team, week, data) values ('tiny', null, current_date - interval '60 weeks', '{}')`;
  await sql`select prune_packets()`;
  const [{ n }] = await sql`select count(*)::int as n from packets where week < current_date - interval '53 weeks'`;
  expect(n).toBe(0);
});
