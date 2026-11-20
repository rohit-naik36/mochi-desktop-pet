import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../../.github/workflows/", import.meta.url);
for (const f of readdirSync(dir).filter((n) => n.startsWith("company-") && n.endsWith(".yml"))) {
  const t = readFileSync(new URL(f, dir), "utf8");
  const steps = (t.match(/anthropics\/claude-code-action@/g) || []).length;
  if (!steps) continue;
  test(`${f}: every agent step turns AI attribution off`, () => {
    assert.equal((t.match(/"includeCoAuthoredBy": false/g) || []).length, steps);
  });
}

test("company-tests fails agent PRs whose commits carry AI attribution", () => {
  const t = readFileSync(new URL("company-pr-tests.yml", dir), "utf8");
  assert.match(t, /No AI attribution in agent commits/);
  assert.match(t, /fetch-depth: 0/);
});
