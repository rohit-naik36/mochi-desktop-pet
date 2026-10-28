// "Notice which app I'm in" (off unless the user turns it on). Once a minute
// Mochi asks the system for the NAME of the app in front, like "EXCEL" or
// "Google Chrome", and maps it to a kind of app for a playful line. Window
// titles, screen contents and websites are never read; nothing is saved or sent.
const { spawn, execFile } = require('child_process');

const KINDS = {
  excel: /^(excel|microsoft excel)$/i,
  word: /^(winword|microsoft word|pages)$/i,
  slides: /^(powerpnt|microsoft powerpoint|keynote)$/i,
  mail: /^(outlook|olk|microsoft outlook|mail|thunderbird)$/i,
  chat: /^(ms-teams|teams|microsoft teams|slack|whatsapp(\.root)?)$/i,
  code: /^(code|visual studio code|cursor|devenv|idea64|pycharm64|webstorm64|intellij idea|pycharm|xcode|windowsterminal|terminal|iterm2|android studio|studio64)$/i,
  browser: /^(chrome|google chrome|msedge|microsoft edge|firefox|brave|brave browser|safari|arc|opera)$/i,
  design: /^(figma|photoshop|adobe photoshop.*|illustrator|adobe illustrator.*|canva)$/i,
};

function kindOf(name) {
  const n = String(name || '').trim();
  for (const [k, re] of Object.entries(KINDS)) if (re.test(n)) return k;
  return null;
}

const WIN_SCRIPT = `
Add-Type @"
using System; using System.Runtime.InteropServices;
public class MochiFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
}
"@
while ($true) {
  [uint32]$p = 0
  [void][MochiFg]::GetWindowThreadProcessId([MochiFg]::GetForegroundWindow(), [ref]$p)
  try { $n = (Get-Process -Id $p -ErrorAction Stop).ProcessName } catch { $n = '' }
  [Console]::Out.WriteLine($n); [Console]::Out.Flush()
  Start-Sleep -Seconds 60
}`;

let child = null, macTimer = null;

const run = (cmd, args) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: 4000 }, (err, out) => resolve(err ? '' : String(out)));
});

async function macFront() {
  const asn = (await run('lsappinfo', ['front'])).trim();
  if (!asn) return '';
  const info = await run('lsappinfo', ['info', '-only', 'name', asn]);
  const m = /=\s*"([^"]*)"/.exec(info);
  return m ? m[1] : '';
}

const supported = () => process.platform === 'win32' || process.platform === 'darwin';

// Calls onApp(kind) about once a minute; kind is null for any other app.
function start(onApp) {
  stop();
  if (process.platform === 'win32') {
    child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', WIN_SCRIPT], { windowsHide: true });
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const l of lines) onApp(kindOf(l));
    });
    child.on('error', () => { child = null; });
    child.on('exit', () => { child = null; });
  } else if (process.platform === 'darwin') {
    const tick = async () => onApp(kindOf(await macFront()));
    tick();
    macTimer = setInterval(tick, 60_000);
  }
}

function stop() {
  if (child) { try { child.kill(); } catch {} child = null; }
  clearInterval(macTimer);
  macTimer = null;
}

module.exports = { start, stop, kindOf, supported, WIN_SCRIPT };
