import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fakeGh } from "./helpers.mjs";
import { parseCommand, run } from "../scripts/ceo-command.mjs";

const REPO = "rohit-naik36/mochi-desktop-pet";
const HQ = "rohit-naik36/little-smoke-hq";
const SHA = "b".repeat(40);
const green = [
  { name: "company-tests", status: "COMPLETED", conclusion: "SUCCESS" },
  { name: "company-security-verdict", status: "COMPLETED", conclusion: "SUCCESS" },
];
const pr = (over = {}) => ({
  number: 9, url: `https://github.com/${REPO}/pull/9`, state: "OPEN", isDraft: false,
  baseRefName: "develop", headRefName: "agent/9-x", headRefOid: SHA, isCrossRepository: false,
  mergeable: "MERGEABLE", labels: [{ name: "ceo-approval" }], statusCheckRollup: green, ...over,
});
const env = (over = {}) => ({
  NUMBER: "9", IS_PR: "true", BODY: "/approve", GITHUB_REPOSITORY: REPO, CODE_REPO: REPO, COMPANY_MODE: "on",
  REQUIRED_CHECKS: "company-tests,company-security-verdict", ...over,
});

describe("parseCommand", () => {
  const cases = [
    ["/approve", "approve"], ["/APPROVE", "approve"], ["/reject too costly", "reject"],
    ["/change use the softer copy\nmore detail on line two", "change"], ["/pause", "pause"], ["  /resume  ", "resume"],
  ];
  for (const [body, cmd] of cases) test(`accepts ${JSON.stringify(body)}`, () => assert.equal(parseCommand(body).cmd, cmd));
  for (const body of ["approve", "/approvex", "/deploy", "/", "", "please /approve", "/pause $(id)", "/approve `rm -rf /`", null]) {
    test(`rejects ${JSON.stringify(body)}`, () => assert.ok(parseCommand(body).error));
  }
  test("note is cleaned and capped", () => {
    const r = parseCommand("/reject " + "x".repeat(5000) + "\u0007");
    assert.ok(r.note.length <= 1000);
    assert.ok(!r.note.includes("\u0007"));
  });
});

describe("CEO /approve on pull requests (mocked gh)", () => {
  let gh;
  const withPr = (p) => gh.reset([{ args: ["pr", "view", "9", "--repo", REPO, "--json", "*"], stdout: p }]);
  beforeEach(() => { gh = fakeGh(); });

  test("approves and merges a fully green, labelled PR at its head commit", () => {
    withPr(pr());
    assert.equal(run(env()).action, "merged");
    const merge = gh.calls().find((c) => c.args[1] === "merge");
    assert.deepEqual(merge.args.slice(-2), ["--match-head-commit", SHA]);
  });
  test("refuses without the ceo-approval label", () => {
    withPr(pr({ labels: [] }));
    assert.equal(run(env()).action, "refused");
    assert.equal(gh.merged(), false);
  });
  test("refuses an unrelated PR from another repository", () => {
    withPr(pr({ url: "https://github.com/someone/else/pull/9" }));
    assert.equal(run(env()).action, "refused");
    assert.equal(gh.merged(), false);
  });
  test("refuses a fork PR", () => {
    withPr(pr({ isCrossRepository: true }));
    assert.equal(run(env()).action, "refused");
    assert.equal(gh.merged(), false);
  });
  test("refuses a PR made in the HQ repo", () => {
    withPr(pr());
    assert.equal(run(env({ GITHUB_REPOSITORY: HQ })).action, "refused");
    assert.equal(gh.merged(), false);
  });
  test("refuses the wrong target branch", () => {
    withPr(pr({ baseRefName: "main" }));
    assert.equal(run(env()).action, "refused");
    assert.equal(gh.merged(), false);
  });
  test("refuses closed, draft or conflicting PRs", () => {
    for (const o of [{ state: "CLOSED" }, { state: "MERGED" }, { isDraft: true }, { mergeable: "CONFLICTING" }]) {
      gh = fakeGh(); withPr(pr(o));
      assert.equal(run(env()).action, "refused", JSON.stringify(o));
      assert.equal(gh.merged(), false);
    }
  });
  test("never bypasses failed tests", () => {
    withPr(pr({ statusCheckRollup: [{ ...green[0], conclusion: "FAILURE" }, green[1]] }));
    assert.equal(run(env()).action, "refused");
    assert.equal(gh.merged(), false);
  });
  test("refuses when a required security check is missing or pending", () => {
    withPr(pr({ statusCheckRollup: [green[0]] }));
    assert.equal(run(env()).action, "refused");
    gh = fakeGh(); withPr(pr({ statusCheckRollup: [green[0], { name: "company-security-verdict", status: "IN_PROGRESS" }] }));
    assert.equal(run(env()).action, "refused");
    assert.equal(gh.merged(), false);
  });
  for (const [label, mode] of [["paused", "pause"], ["off", "off"], ["unset", undefined], ["empty", ""]]) {
    test(`refuses to merge while the company is ${label}, and says why`, () => {
      withPr(pr());
      const r = run(env({ COMPANY_MODE: mode }));
      assert.equal(r.action, "refused");
      assert.equal(gh.merged(), false);
      assert.equal(gh.calls().filter((c) => c.args[0] === "pr" && c.args[1] === "view").length, 0, "no PR lookup when paused");
      const msg = gh.calls().find((c) => c.args[1] === "comment").args.at(-1);
      assert.match(msg, /Not merged/);
      assert.match(msg, mode ? new RegExp(mode) : /unset/);
      assert.match(msg, /\/resume/);
    });
  }
  test("refuses while must-fix items are outstanding, even with ceo-approval", () => {
    withPr(pr({ labels: [{ name: "ceo-approval" }, { name: "changes-requested" }] }));
    const r = run(env());
    assert.equal(r.action, "refused");
    assert.ok(r.problems.some((p) => /must-fix/.test(p)));
    assert.equal(gh.merged(), false);
  });
  test("refuses when any other check failed", () => {
    withPr(pr({ statusCheckRollup: [...green, { name: "build", status: "COMPLETED", conclusion: "CANCELLED" }] }));
    assert.equal(run(env()).action, "refused");
    assert.equal(gh.merged(), false);
  });
});

describe("other commands (mocked gh)", () => {
  let gh;
  beforeEach(() => { gh = fakeGh(); });

  test("/approve on an approval issue only works when it is labelled", () => {
    gh.reset([{ args: ["issue", "view", "9", "--repo", HQ, "--json", "labels,state"], stdout: { state: "OPEN", labels: [] } }]);
    assert.equal(run(env({ IS_PR: "false", GITHUB_REPOSITORY: HQ, CODE_REPO: REPO })).action, "refused");
    gh.reset([{ args: ["issue", "view", "9", "--repo", HQ, "--json", "labels,state"], stdout: { state: "OPEN", labels: [{ name: "ceo-approval" }] } }]);
    assert.equal(run(env({ IS_PR: "false", GITHUB_REPOSITORY: HQ, CODE_REPO: REPO })).action, "approved");
    assert.ok(gh.calls().some((c) => c.args.includes("approved")));
  });
  test("/reject closes with the note", () => {
    assert.equal(run(env({ BODY: "/reject too costly" })).action, "rejected");
    const close = gh.calls().find((c) => c.args[1] === "close");
    assert.match(close.args.at(-1), /too costly/);
    assert.equal(gh.merged(), false);
  });
  test("/change labels the item and records the note", () => {
    assert.equal(run(env({ BODY: "/change smaller scope" })).action, "changes");
    assert.ok(gh.calls().some((c) => c.args.includes("ceo-changes")));
  });
  test("/pause and /resume work in every mode", () => {
    for (const COMPANY_MODE of ["on", "pause", "off", undefined]) {
      gh = fakeGh();
      assert.equal(run(env({ BODY: "/pause", IS_PR: "false", COMPANY_MODE })).action, "pause");
      assert.equal(run(env({ BODY: "/resume", IS_PR: "false", COMPANY_MODE })).action, "resume");
      assert.equal(gh.calls().filter((c) => c.args[0] === "variable").length, 2, String(COMPANY_MODE));
    }
  });
  test("/reject still works while paused", () => {
    assert.equal(run(env({ BODY: "/reject not now", COMPANY_MODE: "pause" })).action, "rejected");
    assert.equal(gh.merged(), false);
  });
  test("/pause and /resume set COMPANY_MODE on the code repo, even from HQ", () => {
    run(env({ BODY: "/pause", IS_PR: "false", GITHUB_REPOSITORY: HQ }));
    run(env({ BODY: "/resume", IS_PR: "false", GITHUB_REPOSITORY: HQ }));
    const sets = gh.calls().filter((c) => c.args[0] === "variable");
    assert.deepEqual(sets.map((c) => c.args), [
      ["variable", "set", "COMPANY_MODE", "--body", "pause", "--repo", REPO],
      ["variable", "set", "COMPANY_MODE", "--body", "on", "--repo", REPO],
    ]);
  });
  test("malformed commands do nothing", () => {
    for (const BODY of ["/approvex", "approve", "/pause now; curl evil", "/deploy"]) {
      gh = fakeGh();
      assert.equal(run(env({ BODY })).action, "ignored", BODY);
      assert.equal(gh.calls().length, 0, BODY);
    }
  });
  test("invalid numbers and flags fail closed", () => {
    assert.throws(() => run(env({ NUMBER: "9 --admin" })));
    assert.throws(() => run(env({ NUMBER: "0" })));
    assert.throws(() => run(env({ IS_PR: "maybe" })));
    assert.throws(() => run(env({ CODE_REPO: "bad repo" })));
    assert.equal(gh.calls().length, 0);
  });
});
