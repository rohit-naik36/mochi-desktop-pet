import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const name of ["dev-cycle", "weekly", "release", "standup"]) {
  test(`${name} playbook keeps sub-agents in the foreground`, () => {
    const t = readFileSync(new URL(`../playbooks/${name}.md`, import.meta.url), "utf8");
    assert.match(t, /run every sub-agent \(Task tool\) in the foreground/);
    assert.match(t, /Never end your run while a sub-agent is still working/);
  });
}
