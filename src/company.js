// Mochi for Teams: the company's own support contacts and teams.
// A company joins with a code. IT can also roll Mochi out with a
// mochi-teams.json file (see teams/IT-ROLLOUT.md) so people join without
// typing anything. Insights stay off until each person turns them on.
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

module.exports = { lookup, fromFile, clean, DEMO_CODE };
