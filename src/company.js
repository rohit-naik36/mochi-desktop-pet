// Mochi for Teams: the company's own support contacts and teams.
// A company joins with a code. IT can also roll Mochi out with a
// mochi-teams.json file (see teams/IT-ROLLOUT.md) so people join without
// typing anything. Insights stay off until each person turns them on.
//
// With the Teams server set up, the code is checked there: the laptop counts
// as one seat for the month and gets the company's current contacts, teams
// and welcome note. The demo code always works, even offline.
const fs = require('fs');
const path = require('path');

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
};

const str = (v, max = 120) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
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

// The company for a code someone typed, or null.
function lookup(code, userData) {
  const c = str(code, 40).toUpperCase().replace(/\s+/g, '');
  if (!c) return null;
  if (c === DEMO_CODE) return { ...DEMO };
  const file = fromFile(userData);
  return file && file.code === c ? file : null;
}

// ---------- the Teams server ----------

// Base address of the server's functions, for example
// https://<project>.supabase.co/functions/v1 (see server/ADMIN.md).
const SERVER = process.env.MOCHI_SERVER || '';

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
