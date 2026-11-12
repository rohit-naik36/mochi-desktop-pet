// Static checks on setup.sh. The script is NOT executed by these tests (by instruction).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, "../scripts/setup.sh");
const text = fs.readFileSync(file, "utf8");
const at = (needle) => { const i = text.indexOf(needle); assert.ok(i >= 0, `missing: ${needle}`); return i; };

test("setup.sh parses", () => { execFileSync("bash", ["-n", file]); });
test("stops on any error, including in functions and subshells", () => {
  assert.match(text, /^set -Eeuo pipefail$/m);
  assert.match(text, /trap '[^']*SETUP FAILED[^']*' ERR/);
});
test("no error masking", () => {
  assert.ok(!/\|\|\s*true/.test(text), "no '|| true'");
  assert.ok(!/gh repo clone[^\n]*\|\|/.test(text), "clone failure is not masked");
  assert.ok(!/git push[^\n]*\|\|/.test(text), "push failure is not masked");
});
test("HQ privacy is verified before anything is cloned or written", () => {
  const check = at('if [ "$VIS" != "PRIVATE" ]; then');
  assert.ok(check < at("gh repo clone"), "privacy check precedes clone");
  assert.ok(check < at('cp company/workflows/company-ceo-commands.yml "$TMP'), "privacy check precedes copying");
  assert.ok(check < at("git push -q origin HEAD"), "privacy check precedes push");
  assert.match(text, /\[ "\$HQ" != "\$CODE" \]/);
});
test("HQ commit and push are not optional", () => {
  assert.match(text, /git commit -qm "chore: HQ setup"\n\s+git push -q origin HEAD/);
});
test("success is printed only at the very end", () => {
  const done = at("Setup completed successfully");
  assert.ok(done > at("trap - ERR"));
  assert.ok(done > at("5/5 Checking secrets"));
  assert.ok(done > at("gh variable set CODE_REPO"));
});
test("leaves COMPANY_MODE=pause and never turns it on", () => {
  assert.match(text, /gh variable set COMPANY_MODE --body pause/);
  assert.ok(!/COMPANY_MODE --body on/.test(text));
});
