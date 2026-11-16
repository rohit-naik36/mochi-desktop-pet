// The Mac build's signing certificate must never be reachable from a pull request.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(root, ".github/workflows/build-mac.yml"), "utf8");
const job = (name) => {
  const start = src.indexOf(`\n  ${name}:\n`);
  assert.ok(start > 0, `job ${name} exists`);
  const rest = src.slice(start + 1);
  const next = rest.slice(3).search(/\n  [a-z][a-z0-9-]*:\n/);
  return next < 0 ? rest : rest.slice(0, next + 3);
};

describe("Build Mac: signing stays out of pull requests", () => {
  const build = job("build"), signed = job("signed");

  test("the test build (pull requests) uses no secrets at all", () => {
    assert.ok(!/secrets\./.test(build), "a PR runs its own copy of this file; any secret here is a secret a PR can take");
    assert.ok(!/environment:/.test(build));
    assert.match(build, /CSC_IDENTITY_AUTO_DISCOVERY: "false"/);
  });

  test("every secret in the file is read only by the signed job", () => {
    const outside = src.replace(signed, "");
    assert.ok(!/secrets\./.test(outside));
  });

  test("the signed job takes its secrets from the mac-signing environment and never runs for a PR", () => {
    assert.match(signed, /\n    environment: mac-signing\n/);
    assert.match(signed, /if: github\.event_name != 'pull_request' && /);
  });

  test("a release never ships unsigned: missing secrets fail the job", () => {
    assert.match(signed, /is empty: check the mac-signing environment"; exit 1/);
    assert.ok(!/unset CSC_LINK/.test(signed));
  });

  test("the signed build is verified: Developer ID, stapled ticket, Gatekeeper", () => {
    for (const re of [/codesign --verify --deep --strict/, /Authority=Developer ID Application/, /xcrun stapler validate/, /spctl --assess --type execute/])
      assert.match(signed, re);
  });

  test("every action is pinned to a commit SHA, and checkouts keep no credentials", () => {
    const uses = [...src.matchAll(/uses: ([^\s#]+)/g)].map((m) => m[1]);
    assert.ok(uses.length >= 6);
    for (const u of uses) assert.match(u, /@[0-9a-f]{40}$/, u);
    const checkouts = src.match(/actions\/checkout@[\s\S]*?(?=\n      - )/g);
    for (const c of checkouts) assert.match(c, /persist-credentials: false/);
  });

  test("the workflow token is read-only unless a job needs to publish", () => {
    assert.match(src, /\npermissions:\n  contents: read\n/);
  });
});
