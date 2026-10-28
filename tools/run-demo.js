// npm run demo: start the demo app from the repo, with its own throwaway data
// folder so it never touches the Mochi you run while developing.
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const electron = require('electron'); // the path to the Electron binary

const data = path.join(os.tmpdir(), 'mochi-demo-dev');
const child = spawn(electron, ['.', `--user-data-dir=${data}`], {
  stdio: 'inherit',
  env: { ...process.env, MOCHI_DEMO: '1' },
});
child.on('exit', (code) => process.exit(code == null ? 0 : code));
