import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chooseTask, weekOf, researchBrief, releaseAction, FAIL_MARK } from "../scripts/exec-pick.mjs";
import { fakeGh, parseOutputs } from "./helpers.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../scripts/exec-pick.mjs");
const HQ = "rohit-naik36/little-smoke-hq";
const CEO = "rohit-naik36";
const iss = (number, labels, extra = {}) => ({ number, title: `t${number}`, labels: labels.map((name) => ({ name })), createdAt: `2026-11-${10 + number}T00:00:00Z`, author: { login: CEO }, ...extra });

describe("exec task selection", () => {
  test("picks a ready task with exactly one exec role", () => {
    assert.equal(chooseTask([iss(1, ["exec", "status:ready", "role:cfo"])], CEO).role, "cfo");
  });
  test("ignores tasks not written by the CEO", () => {
    assert.equal(chooseTask([iss(1, ["exec", "status:ready", "role:cfo"], { author: { login: "someone" } })], CEO), null);
  });
  test("ignores in-progress, blocked, awaiting-approval and role-less or multi-role tasks", () => {
    const t = chooseTask([
      iss(1, ["exec", "status:ready", "role:cfo", "status:in-progress"]),
      iss(2, ["exec", "status:ready", "role:cfo", "status:blocked"]),
      iss(3, ["exec", "status:ready", "role:cfo", "ceo-approval"]),
      iss(4, ["exec", "status:ready"]),
      iss(5, ["exec", "status:ready", "role:cfo", "role:cmo"]),
      iss(6, ["exec", "status:ready", "role:desktop-engineer"]),
      iss(7, ["status:ready", "role:cfo"]),
    ], CEO);
    assert.equal(t, null);
  });
  test("CEO change requests are picked up as revisions", () => {
    const t = chooseTask([iss(1, ["exec", "ceo-changes", "status:review", "role:cmo"])], CEO);
    assert.equal(t.number, 1); assert.equal(t.isRevision, true);
  });
  test("priority first, then oldest", () => {
    const t = chooseTask([iss(1, ["exec", "status:ready", "role:coo"]), iss(2, ["exec", "status:ready", "role:cfo", "priority:p0"]), iss(3, ["exec", "status:ready", "role:cmo", "priority:p0"])], CEO);
    assert.equal(t.number, 2);
  });
  test("week of is the Monday in IST", () => {
    assert.equal(weekOf(new Date("2026-11-15T20:00:00Z")), "2026-11-16"); // Monday 01:30 IST
    assert.equal(weekOf(new Date("2026-11-13T12:00:00Z")), "2026-11-09");
  });
  test("research brief carries title and body only, cleaned and capped", () => {
    const b = researchBrief({ title: "Pricing\u0007", body: "x".repeat(30000), role: "cfo" });
    assert.ok(!b.includes("\u0007")); assert.ok(b.length < 21000); assert.match(b, /Role: cfo/);
  });
  test("failed runs requeue once, then block (no endless retry)", () => {
    assert.equal(releaseAction([]).label, "status:ready");
    assert.equal(releaseAction([{ body: `${FAIL_MARK} earlier` }]).label, "status:blocked");
    assert.equal(releaseAction([{ body: "unrelated" }]).label, "status:ready");
  });
});

describe("exec-pick CLI with mocked gh", () => {
  let gh, dir, out;
  const env = () => ({ ...process.env, HQ_REPO: HQ, CODE_REPO: "rohit-naik36/mochi-desktop-pet", HQ_GH_TOKEN: "hq-token", CEO_LOGIN: CEO, GITHUB_OUTPUT: out, COMPANY_GH_TOKEN: "" });
  const run = (...a) => execFileSync(process.execPath, [SCRIPT, ...a], { cwd: dir, env: env(), encoding: "utf8", stdio: "pipe" });
  const priv = { args: ["repo", "view", HQ], stdout: { visibility: "PRIVATE", isPrivate: true } };
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "exec-")); out = path.join(dir, "out"); });

  test("picks, marks in progress, writes the brief and outputs number and role", () => {
    gh = fakeGh([priv,
      { args: ["issue", "list", "--label", "exec"], stdout: [iss(9, ["exec", "status:ready", "role:cmo"])] },
      { args: ["issue", "view", "9"], stdout: { title: "ICP", body: "Define the ICP" } }]);
    run();
    const o = parseOutputs(out);
    assert.equal(o.number, "9"); assert.equal(o.role, "cmo");
    const edit = gh.calls().find((c) => c.args[0] === "issue" && c.args[1] === "edit");
    assert.deepEqual(edit.args.slice(0, 7), ["issue", "edit", "9", "--add-label", "status:in-progress", "--remove-label", "status:ready"]);
    assert.ok(gh.calls().every((c) => c.token === "hq-token"), "only the HQ token is used");
    assert.match(fs.readFileSync(path.join(dir, ".company/task.md"), "utf8"), /Define the ICP/);
  });
  test("nothing ready: empty outputs, no changes", () => {
    gh = fakeGh([priv, { args: ["issue", "list", "--label", "exec"], stdout: [] }]);
    run();
    assert.equal(parseOutputs(out).number, "");
    assert.equal(gh.mutations().length, 0);
  });
  test("refuses a public HQ repo", () => {
    gh = fakeGh([{ args: ["repo", "view", HQ], stdout: { visibility: "PUBLIC", isPrivate: false } }]);
    assert.throws(() => run());
    assert.equal(gh.mutations().length, 0);
  });
  test("weekly LinkedIn task is created once per week", () => {
    gh = fakeGh([priv, { args: ["issue", "list", "--label", "linkedin"], stdout: [] }, { args: ["issue", "list", "--label", "exec"], stdout: [] }]);
    run("--weekly-linkedin");
    assert.equal(gh.calls().filter((c) => c.args[1] === "create").length, 1);
    gh.reset([priv, { args: ["issue", "list", "--label", "linkedin"], stdout: [{ title: `LinkedIn posts — week of ${weekOf()}` }] }, { args: ["issue", "list", "--label", "exec"], stdout: [] }]);
    run("--weekly-linkedin");
    assert.equal(gh.calls().filter((c) => c.args[1] === "create").length, 0);
  });
  test("--brief rejects bad input", () => {
    gh = fakeGh([priv]);
    assert.throws(() => run("--brief", "9;rm", "cfo"));
    assert.throws(() => run("--brief", "9", "cto"));
  });
  test("--release blocks after a previous failure", () => {
    gh = fakeGh([priv, { args: ["issue", "view", "9"], stdout: { comments: [{ body: FAIL_MARK }] } }]);
    run("--release", "9");
    const edit = gh.calls().find((c) => c.args[1] === "edit");
    assert.ok(edit.args.includes("status:blocked"));
  });
});
