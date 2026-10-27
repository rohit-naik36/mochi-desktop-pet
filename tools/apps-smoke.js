// Checks on Windows CI that the foreground-app script compiles and reports
// once. Run: node tools/apps-smoke.js
const { spawn } = require('child_process');
const { WIN_SCRIPT } = require('../src/apps');
const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', WIN_SCRIPT], { windowsHide: true });
let err = '';
ps.stderr.on('data', (d) => { err += d; });
ps.stdout.once('data', (d) => { console.log('foreground app:', JSON.stringify(String(d).trim())); ps.kill(); process.exit(err ? 1 : 0); });
setTimeout(() => { console.error('no output in 30 s', err); ps.kill(); process.exit(1); }, 30000);
