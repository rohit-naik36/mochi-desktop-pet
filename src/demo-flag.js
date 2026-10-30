// Is this the Mochi Demo app? Only the demo build says so: demo/electron-builder.yml
// sets "mochiDemo": true in the packaged package.json. A packaged app (the Store
// build, the installer, the portable exe) can't be switched into demo mode with an
// environment variable or a command-line option. Running from the repo with
// MOCHI_DEMO=1 is allowed so the tour can be developed without packaging.
function isDemo(pkg, packaged, env) {
  if (pkg && pkg.mochiDemo === true) return true;
  return !packaged && !!env && env.MOCHI_DEMO === '1';
}

module.exports = { isDemo };
