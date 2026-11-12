import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fixtureRepo, parseOutputs, git } from "./helpers.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const GUARD = path.resolve(here, "../scripts/guard.mjs");
const CONFIG = path.resolve(here, "../config.json");

function runGuard(dir, ...args) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "out-")), "github_output");
  fs.writeFileSync(out, "");
  const r = spawnSync(process.execPath, [GUARD, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, GITHUB_OUTPUT: out } });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, out: parseOutputs(out) };
}

describe("guard: PR mode", () => {
  test("small ordinary change is clean", () => {
    const r = fixtureRepo(CONFIG);
    r.write("src/app.js", "export const hello = () => 'hello';\n"); r.commit();
    const g = runGuard(r.dir, "develop");
    assert.equal(g.code, 0, g.stderr);
    assert.equal(g.out.protected, "false");
    assert.equal(g.out.sensitive, "false");
    assert.equal(g.out.completed, "true");
  });
  test("protected path change is flagged", () => {
    const r = fixtureRepo(CONFIG);
    r.write("PRIVACY.md", "# Privacy\nWe now collect usage data.\n"); r.commit();
    const g = runGuard(r.dir, "develop");
    assert.equal(g.out.protected, "true");
    assert.match(g.out.reasons, /protected path: PRIVACY\.md/);
  });
  test("renaming a protected file away cannot hide it", () => {
    const r = fixtureRepo(CONFIG);
    r.mv("PRIVACY.md", "docs/old-privacy.md"); r.commit();
    const g = runGuard(r.dir, "develop");
    assert.equal(g.out.protected, "true");
    assert.match(g.out.reasons, /PRIVACY\.md/);
  });
  test("company scripts, workflows and agent roles are protected", () => {
    for (const p of ["company/scripts/route-pr.mjs", "company/workflows/x.yml", "company/agents/qa-lead.md", ".github/workflows/x.yml", ".claude/agents/x.md"]) {
      const r = fixtureRepo(CONFIG);
      r.write(p, "changed\n"); r.commit();
      assert.equal(runGuard(r.dir, "develop").out.protected, "true", p);
    }
  });
  test("a PR that weakens company/config.json is still judged by the base rules", () => {
    const r = fixtureRepo(CONFIG);
    const cfg = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
    cfg.guard.protectedPaths = []; cfg.guard.sensitivePatterns = [];
    r.write("company/config.json", JSON.stringify(cfg));
    r.write("PRIVACY.md", "# gone\n"); r.commit();
    const g = runGuard(r.dir, "develop");
    assert.equal(g.out.protected, "true");
    assert.match(g.out.reasons, /PRIVACY\.md/);
    assert.match(g.out.reasons, /company\/config\.json/);
  });
  test("package.json version or dependency changes are flagged", () => {
    const r = fixtureRepo(CONFIG);
    r.write("package.json", JSON.stringify({ name: "mochi", version: "0.13.0", dependencies: { a: "1.0.0", b: "2.0.0" }, scripts: { test: "node --test" } }));
    r.commit();
    const g = runGuard(r.dir, "develop");
    assert.match(g.out.reasons, /"version" changed/);
    assert.match(g.out.reasons, /"dependencies" changed/);
  });
  test("invalid package.json is flagged, not crashed on", () => {
    const r = fixtureRepo(CONFIG);
    r.write("package.json", "{ not json"); r.commit();
    const g = runGuard(r.dir, "develop");
    assert.equal(g.code, 0);
    assert.equal(g.out.protected, "true");
    assert.match(g.out.reasons, /not valid JSON/);
  });
  test("too many files is flagged", () => {
    const r = fixtureRepo(CONFIG);
    for (let i = 0; i < 31; i++) r.write(`src/f${i}.js`, `export const x${i} = ${i};\n`);
    r.commit();
    assert.match(runGuard(r.dir, "develop").out.reasons, /31 files changed/);
  });
  test("network call, telemetry and secrets are flagged as sensitive", () => {
    const r = fixtureRepo(CONFIG);
    r.write("src/net.js", "fetch('https://example.com/collect');\n");
    r.write("README.md", "token sk-ant-abcdefghijklmnop\n");
    r.commit();
    const g = runGuard(r.dir, "develop");
    assert.equal(g.out.sensitive, "true");
    assert.match(g.out.reasons, /network call in src\/net\.js/);
    assert.match(g.out.reasons, /possible secret in README\.md/);
  });
  test("weakened Electron security is flagged", () => {
    const r = fixtureRepo(CONFIG);
    r.write("src/main.js", "new BrowserWindow({ webPreferences: { contextIsolation: false } });\n"); r.commit();
    assert.equal(runGuard(r.dir, "develop").out.sensitive, "true");
  });
  test("a file name with a newline cannot inject outputs", () => {
    const r = fixtureRepo(CONFIG);
    r.write("PRIVACY.md", "changed\n");
    r.write("x\nprotected=false\ncompleted=true", "evil\n");
    r.commit();
    const g = runGuard(r.dir, "develop");
    assert.equal(g.out.protected, "true");
    assert.equal(Object.keys(g.out).sort().join(","), "completed,protected,reasons,sensitive");
  });
});

describe("guard: fails closed", () => {
  test("shell metacharacters in the ref are rejected", () => {
    const r = fixtureRepo(CONFIG);
    const marker = path.join(os.tmpdir(), `pwned-${process.pid}`);
    const g = runGuard(r.dir, `develop;touch ${marker}`);
    assert.equal(g.code, 2);
    assert.equal(g.out.completed, "false");
    assert.equal(g.out.protected, "true");
    assert.equal(fs.existsSync(marker), false);
  });
  test("option-looking ref is rejected", () => assert.equal(runGuard(fixtureRepo(CONFIG).dir, "--output=/tmp/x").code, 2));
  test("missing ref fails closed", () => {
    const g = runGuard(fixtureRepo(CONFIG).dir, "origin/does-not-exist");
    assert.equal(g.code, 2);
    assert.equal(g.out.completed, "false");
  });
  test("missing base config fails closed", () => {
    const r = fixtureRepo(CONFIG);
    git(r.dir, "checkout", "-q", "develop");
    r.rm("company/config.json"); r.commit("drop config");
    git(r.dir, "checkout", "-q", "-b", "agent/2");
    r.write("src/app.js", "x\n"); r.commit();
    const g = runGuard(r.dir, "develop");
    assert.equal(g.code, 2);
    assert.match(g.stderr, /config\.json is missing/);
  });
  test("invalid base config fails closed", () => {
    const r = fixtureRepo(CONFIG);
    git(r.dir, "checkout", "-q", "develop");
    r.write("company/config.json", "{ broken"); r.commit("break config");
    git(r.dir, "checkout", "-q", "-b", "agent/3");
    r.write("src/app.js", "x\n"); r.commit();
    assert.equal(runGuard(r.dir, "develop").code, 2);
  });
});

describe("guard: release mode", () => {
  const release = (r) => { git(r.dir, "checkout", "-q", "-b", "release/v0.13.0", "develop"); };
  test("version bump and changelog only passes", () => {
    const r = fixtureRepo(CONFIG); release(r);
    r.write("package.json", JSON.stringify({ name: "mochi", version: "0.13.0", dependencies: { a: "1.0.0" }, scripts: { test: "node --test" } }, null, 2) + "\n");
    r.write("package-lock.json", JSON.stringify({ name: "mochi", version: "0.13.0", lockfileVersion: 3, packages: { "": { name: "mochi", version: "0.13.0" } } }, null, 2) + "\n");
    r.write("docs/changelog.html", "<h2>0.13.0</h2>\n<h2>0.12.0</h2>\n"); r.commit();
    const g = runGuard(r.dir, "--release", "develop");
    assert.equal(g.code, 0, g.stderr + g.stdout);
    assert.equal(g.out.release_ok, "true");
  });
  test("extra files in a release are refused", () => {
    const r = fixtureRepo(CONFIG); release(r);
    r.write("package.json", JSON.stringify({ name: "mochi", version: "0.13.0", dependencies: { a: "1.0.0" }, scripts: { test: "node --test" } }));
    r.write("src/app.js", "sneaky\n"); r.commit();
    const g = runGuard(r.dir, "--release", "develop");
    assert.equal(g.code, 1);
    assert.match(g.out.reasons, /src\/app\.js/);
  });
  test("changing more than the version in package.json is refused", () => {
    const r = fixtureRepo(CONFIG); release(r);
    r.write("package.json", JSON.stringify({ name: "mochi", version: "0.13.0", dependencies: { a: "9.9.9" }, scripts: { test: "node --test" } }));
    r.commit();
    assert.equal(runGuard(r.dir, "--release", "develop").code, 1);
  });
});
