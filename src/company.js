// Mochi for Teams: the company's own support contacts, teams, wellness
// campaigns and check-in questions.
// A company joins with a code. IT can also roll Mochi out with a
// mochi-teams.json file (see teams/IT-ROLLOUT.md) so people join without
// typing anything. Insights stay off until each person turns them on.
//
// With the Teams server set up, the code is checked there: the laptop counts
// as one seat for the month and gets the company's current contacts, teams
// and welcome note. The demo code always works, even offline.
const fs = require('fs');
const path = require('path');
const Campaigns = require('./campaigns');

const DEMO_CODE = 'MOCHI-DEMO-2026';
const DEMO = {
  id: 'acme-demo',
  code: DEMO_CODE,
  name: 'Acme Demo Pvt Ltd',
  demo: true,
  support: [
    { name: 'Acme Care EAP (free, confidential, 24/7)', number: '1800-000-0000 (demo)' },
    { name: 'Your HR partner', number: 'people@acme.example' },
  ],
  posh: { name: 'Internal Committee (POSH)', number: 'ic@acme.example' },
  teams: ['Engineering', 'Customer Support', 'Sales', 'Operations', 'Finance', 'HR and Admin', 'Design', 'Legal'],
  campaigns: [{ id: 'demo-calm', theme: 'breathe', start: '2026-01-01', end: '2099-12-31', note: 'Free 15-minute calm sessions with our EAP every Friday at 4 pm.' }],
  questions: [{ id: 'demo-workload', text: 'How manageable was your workload this week?', options: ['Very', 'Mostly', 'Not really', 'Not at all'], start: '2026-01-01', end: '2099-12-31' }],
};

const str = (v, max = 120) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const isId = (v) => typeof v === 'string' && /^[a-z0-9-]{1,40}$/.test(v);
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const campaign = (c) => (c && isId(c.id) && Campaigns.THEMES[c.theme] && isDay(c.start) && isDay(c.end) && c.start <= c.end
  ? { id: c.id, theme: c.theme, start: c.start, end: c.end, note: str(c.note, 100) } : null);
const question = (q) => (q && isId(q.id) && str(q.text, 140) && isDay(q.start) && isDay(q.end) && q.start <= q.end &&
  Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 5 && q.options.every((o) => str(o, 30))
  ? { id: q.id, text: str(q.text, 140), options: q.options.map((o) => str(o, 30)), start: q.start, end: q.end } : null);
const contact = (c) => (c && c.name && c.number ? { name: str(c.name), number: str(c.number, 60) } : null);

// Keep only the fields Mochi knows, so a company file can't smuggle in more.
function clean(raw) {
  if (!raw || !raw.code || !raw.name) return null;
  return {
    id: str(raw.id || raw.code, 60).toLowerCase(),
    code: str(raw.code, 40).toUpperCase(),
    name: str(raw.name, 80),
    welcome: str(raw.welcome, 300),
    demo: !!raw.demo,
    support: (Array.isArray(raw.support) ? raw.support : []).map(contact).filter(Boolean).slice(0, 4),
    posh: contact(raw.posh),
    teams: (Array.isArray(raw.teams) ? raw.teams : []).map((t) => str(t, 40)).filter(Boolean).slice(0, 60),
    campaigns: (Array.isArray(raw.campaigns) ? raw.campaigns : []).map(campaign).filter(Boolean).slice(0, 8),
    questions: (Array.isArray(raw.questions) ? raw.questions : []).map(question).filter(Boolean).slice(0, 4),
    autoJoin: !!raw.autoJoin,
  };
}

// Where IT can put mochi-teams.json.
function configPaths(userData) {
  const out = [];
  if (process.env.ProgramData) out.push(path.join(process.env.ProgramData, 'Mochi', 'mochi-teams.json'));
  if (process.platform === 'darwin') out.push('/Library/Application Support/Mochi/mochi-teams.json');
  if (userData) out.push(path.join(userData, 'mochi-teams.json'));
  return out;
}

function fromFile(userData) {
  for (const p of configPaths(userData)) {
    try { const c = clean(JSON.parse(fs.readFileSync(p, 'utf8'))); if (c) return c; } catch { /* not there */ }
  }
  return null;
}

// The demo company, with its campaign and question running this week.
function demo(now = new Date()) {
  const day = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  const week = { start: day(mon), end: day(sun) };
  return { ...DEMO, campaigns: DEMO.campaigns.map((x) => ({ ...x, ...week })), questions: DEMO.questions.map((x) => ({ ...x, ...week })) };
}

// The company for a code someone typed, or null.
function lookup(code, userData) {
  const c = str(code, 40).toUpperCase().replace(/\s+/g, '');
  if (!c) return null;
  if (c === DEMO_CODE) return demo();
  const file = fromFile(userData);
  return file && file.code === c ? file : null;
}

// ---------- the Teams server ----------

// Base address of the server's functions, for example
// https://<project>.supabase.co/functions/v1 (see server/ADMIN.md).
// The Teams server address, e.g. https://<project-ref>.supabase.co/functions/v1
// Left empty until the Supabase project is live (and always empty in the demo).
// MOCHI_SERVER overrides it for testing.
const DEFAULT_SERVER = '';
const SERVER = process.env.MOCHI_SERVER || DEFAULT_SERVER;

async function call(fn, body) {
  if (!SERVER) return { status: 0, body: {} };
  try {
    const res = await fetch(`${SERVER}/${fn}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  } catch {
    return { status: 0, body: {} }; // offline or the server is down
  }
}

// -> { ok: true, company } | { ok: false, reason: 'offline' | 'unknown-code' | 'not-company-laptop' | ... }
async function checkin(code, install, account = {}, version = '') {
  const { status, body } = await call('checkin', { code: str(code, 40).toUpperCase().replace(/\s+/g, ''), install, tenant: account.tenant || '', domain: account.domain || '', version });
  if (status === 200 && body.ok) {
    const company = clean(body.company);
    if (company) return { ok: true, company, graceDays: Number(body.graceDays) || 45 };
  }
  return { ok: false, reason: status === 0 ? 'offline' : String(body.reason || 'server') };
}

// One finished week of counts, on its own, with no laptop id.
async function sendTotals(code, team, week, packet) {
  const { status } = await call('totals', { code, team, week, packet });
  return status === 200 || status === 400; // 400: too old or not allowed, don't retry
}

module.exports = { lookup, fromFile, clean, checkin, sendTotals, hasServer: () => !!SERVER, DEMO_CODE };
