// Mochi for Teams: two facts about this laptop, used only for the company
// licence. Both are read locally and never sent as they are.
// - machineId: the laptop's own id, which only ever leaves as a one-way hash
//   (so it counts one seat, even after a reinstall). The server hashes it
//   again with the company's id and a secret before keeping it.
// - workAccount: whether the laptop is joined to a company's Microsoft Entra
//   tenant or Windows domain, for the company-laptop lock.
const { execFile } = require('child_process');
const crypto = require('crypto');

const run = (cmd, args) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: 8000, windowsHide: true }, (err, out) => resolve(err ? '' : String(out)));
});

// `reg query HKLM\SOFTWARE\Microsoft\Cryptography /v MachineGuid` on Windows,
// `ioreg -rd1 -c IOPlatformExpertDevice` on a Mac.
function parseMachineId(text) {
  const m = /MachineGuid\s+REG_SZ\s+([0-9a-f-]{20,})/i.exec(text) || /"IOPlatformUUID"\s*=\s*"([0-9A-F-]{20,})"/i.exec(text);
  return m ? m[1].toLowerCase() : null;
}

async function machineId() {
  if (process.platform === 'win32') return parseMachineId(await run('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid']));
  if (process.platform === 'darwin') return parseMachineId(await run('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice']));
  return null;
}

// What the licence check sends for this laptop: a one-way hash of its id.
function installHash(id) {
  return crypto.createHash('sha256').update(`mochi-seat:${id}`).digest('hex');
}

// `dsregcmd /status` -> { tenant } when Entra joined (or hybrid joined).
function parseDsreg(text) {
  const t = String(text || '');
  const joined = /AzureAdJoined\s*:\s*YES/i.test(t);
  const tenant = /TenantId\s*:\s*([0-9a-f-]{36})/i.exec(t);
  return { tenant: joined && tenant ? tenant[1].toLowerCase() : '' };
}

// { tenant, domain }: empty strings when the laptop isn't joined to anything
// (a personal laptop), or on a Mac, where the lock isn't supported yet.
async function workAccount() {
  if (process.platform !== 'win32') return { tenant: '', domain: '' };
  const { tenant } = parseDsreg(await run('dsregcmd', ['/status']));
  return { tenant, domain: String(process.env.USERDNSDOMAIN || '').toLowerCase() };
}

module.exports = { machineId, installHash, workAccount, parseMachineId, parseDsreg };
