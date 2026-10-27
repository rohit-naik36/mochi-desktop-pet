// node server/tools/new-pulse-key.mjs <company-id> "<label>"
// Makes a Mochi Pulse key for one HR person. Prints the key (give it to
// them once, it is not stored anywhere) and the SQL to run in Supabase.
import { createHash, randomBytes } from 'crypto';

const [company, label = ''] = process.argv.slice(2);
if (!company) { console.error('Usage: node server/tools/new-pulse-key.mjs <company-id> "<label>"'); process.exit(1); }
const key = 'mp_' + randomBytes(24).toString('base64url');
const hash = createHash('sha256').update(key).digest('hex');
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
console.log(`Pulse key for ${company} (give this to the HR person, it won't be shown again):\n\n  ${key}\n`);
console.log(`Run in Supabase > SQL editor:\n\n  insert into pulse_keys (key_hash, company_id, label) values (${q(hash)}, ${q(company)}, ${q(label)});\n`);
