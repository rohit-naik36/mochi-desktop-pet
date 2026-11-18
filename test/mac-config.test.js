const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const build = pkg.build || {};
const mac = build.mac;
const buildDir = path.join(root, (build.directories && build.directories.buildResources) || 'build');

// electron-builder resolves file paths relative to the project root, then to buildResources.
function resolveBuildFile(p) {
  const candidates = [path.join(root, p), path.join(buildDir, p)];
  return candidates.find((c) => fs.existsSync(c));
}

function targetNames(targets) {
  return (targets || []).map((t) => (typeof t === 'string' ? t : t.target));
}

test('build.mac has a dmg target and a versioned mac artifact name', () => {
  assert.ok(mac, 'build.mac must exist');
  assert.ok(targetNames(mac.target).includes('dmg'), 'build.mac.target must include dmg');
  assert.ok(typeof mac.artifactName === 'string', 'build.mac.artifactName must be set');
  assert.ok(mac.artifactName.includes('${version}'), 'artifactName must contain ${version}');
  assert.ok(mac.artifactName.toLowerCase().includes('mac'), 'artifactName must contain "mac"');
});

test('the mac icon exists on disk', () => {
  assert.ok(mac && mac.icon, 'build.mac.icon must be set');
  assert.ok(resolveBuildFile(mac.icon), `mac icon not found: ${mac.icon}`);
});

test('entitlements files named in the mac config exist in build/', () => {
  const files = [mac.entitlements, mac.entitlementsInherit];
  if (build.mas) files.push(build.mas.entitlements, build.mas.entitlementsInherit);
  const named = files.filter(Boolean);
  assert.ok(named.length >= 2, 'mac entitlements and entitlementsInherit must be named');
  for (const f of named) {
    const found = resolveBuildFile(f);
    assert.ok(found, `entitlements file not found: ${f}`);
    assert.strictEqual(path.dirname(found), buildDir, `${f} must live in build/`);
  }
});

test('package.json has a dist:mac script', () => {
  assert.ok(pkg.scripts && pkg.scripts['dist:mac'], 'dist:mac script must exist');
  assert.match(pkg.scripts['dist:mac'], /electron-builder.*--mac/);
});
