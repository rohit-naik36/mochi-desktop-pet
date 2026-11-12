import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fakeGh } from "./helpers.mjs";
import { validateVerdict, loadVerdict } from "../scripts/lib.mjs";
import { decide, route } from "../scripts/route-pr.mjs";

const SHA = "a".repeat(40);
const REPO = "rohit-naik36/mochi-desktop-pet";
const goodVerdict = { decision: "approve", summary: "Looks right.", must_fix: [], security: "ok" };
const goodPr = {
  number: 7, url: `https://github.com/${REPO}/pull/7`, state: "OPEN", isDraft: false,
  baseRefName: "develop", headRefName: "agent/7-x", headRefOid: SHA, isCrossRepository: false,
  mergeable: "MERGEABLE", labels: [], statusCheckRollup: [],
};
const cleanGuard = { outcome: "success", completed: true, protected: false, sensitive: false, reasons: "clean" };
const ok = (v = goodVerdict) => validateVerdict(v);
const base = (over = {}) => ({
  mode: "on", verdict: ok(), guard: cleanGuard, tests: "success",
  pr: { details: goodPr, expect: { codeRepo: REPO, base: "develop", headSha: SHA } }, ...over,
});

describe("verdict validation", () => {
  test("missing verdict file is invalid", () => {
    const r = loadVerdict(path.join(os.tmpdir(), "does-not-exist", "verdict.json"));
    assert.equal(r.ok, false);
  });
  test("malformed JSON is invalid", () => assert.equal(validateVerdict("{decision: approve").ok, false));
  test("non-object is invalid", () => assert.equal(validateVerdict("[1,2]").ok, false));
  test("unknown decision is invalid", () => assert.equal(validateVerdict({ ...goodVerdict, decision: "lgtm" }).ok, false));
  test("missing summary is invalid", () => assert.equal(validateVerdict({ ...goodVerdict, summary: "" }).ok, false));
  test("must_fix must be an array of strings", () => {
    assert.equal(validateVerdict({ ...goodVerdict, must_fix: "none" }).ok, false);
    assert.equal(validateVerdict({ ...goodVerdict, must_fix: [1] }).ok, false);
  });
  test("missing security field is invalid", () => {
    const { security, ...noSec } = goodVerdict;
    assert.equal(validateVerdict(noSec).ok, false);
  });
  test("blank security field is invalid", () => assert.equal(validateVerdict({ ...goodVerdict, security: "  " }).ok, false));
  test("complete verdict is valid", () => assert.equal(validateVerdict(goodVerdict).ok, true));
});

describe("decide (pure)", () => {
  test("clean approve merges", () => assert.equal(decide(base()).action, "merge"));
  test("invalid verdict never merges", () => assert.equal(decide(base({ verdict: validateVerdict("nope") })).action, "blocked"));
  test("missing security never merges", () => {
    const { security, ...v } = goodVerdict;
    assert.equal(decide(base({ verdict: validateVerdict(v) })).action, "blocked");
  });
  test("risky security goes to the CEO", () => {
    assert.equal(decide(base({ verdict: ok({ ...goodVerdict, security: "adds a network call to an analytics host" }) })).action, "ceo");
  });
  test("approve with must-fix items requests changes", () => {
    assert.equal(decide(base({ verdict: ok({ ...goodVerdict, must_fix: ["add a test"] }) })).action, "changes");
  });
  test("failed tests request changes", () => assert.equal(decide(base({ tests: "failure" })).action, "changes"));
  test("missing or pending tests block", () => {
    assert.equal(decide(base({ tests: "missing" })).action, "blocked");
    assert.equal(decide(base({ tests: "pending" })).action, "blocked");
  });
  test("any other failed check (e.g. build-mac) requests changes", () => {
    const d = decide(base({ otherChecks: { state: "failed", failing: ["build-mac"] } }));
    assert.equal(d.action, "changes");
    assert.match(d.why[0], /build-mac/);
  });
  test("other checks still running at the deadline block", () => {
    assert.equal(decide(base({ otherChecks: { state: "pending", failing: ["build-mac"] } })).action, "blocked");
  });
  test("new commits after review block", () => assert.equal(decide(base({ tests: "superseded" })).action, "blocked"));
  test("failed guard blocks", () => {
    assert.equal(decide(base({ guard: { ...cleanGuard, outcome: "failure" } })).action, "blocked");
    assert.equal(decide(base({ guard: { ...cleanGuard, completed: false } })).action, "blocked");
  });
  test("protected change goes to the CEO, never silently merged", () => {
    assert.equal(decide(base({ guard: { ...cleanGuard, protected: true, reasons: "protected path: PRIVACY.md" } })).action, "ceo");
  });
  test("sensitive change goes to the CEO", () => {
    assert.equal(decide(base({ guard: { ...cleanGuard, sensitive: true, reasons: "network call in src/a.js" } })).action, "ceo");
  });
  test("needs-ceo verdict goes to the CEO", () => assert.equal(decide(base({ verdict: ok({ ...goodVerdict, decision: "needs-ceo" }) })).action, "ceo"));
  test("wrong target branch blocks", () => {
    assert.equal(decide(base({ pr: { details: { ...goodPr, baseRefName: "main" }, expect: { codeRepo: REPO, base: "develop", headSha: SHA } } })).action, "blocked");
  });
  test("closed or unmergeable PR blocks", () => {
    for (const d of [{ state: "CLOSED" }, { mergeable: "CONFLICTING" }, { mergeable: "UNKNOWN" }, { isDraft: true }, { isCrossRepository: true }]) {
      assert.equal(decide(base({ pr: { details: { ...goodPr, ...d }, expect: { codeRepo: REPO, base: "develop", headSha: SHA } } })).action, "blocked", JSON.stringify(d));
    }
  });
  test("PR from another repository blocks", () => {
    assert.equal(decide(base({ pr: { details: { ...goodPr, url: "https://github.com/evil/repo/pull/7" }, expect: { codeRepo: REPO, base: "develop", headSha: SHA } } })).action, "blocked");
  });
  test("paused or off never merges", () => {
    assert.equal(decide(base({ mode: "pause" })).action, "hold");
    assert.equal(decide(base({ mode: "off" })).action, "hold");
    assert.equal(decide(base({ mode: undefined })).action, "hold");
  });
});

describe("decide: escalation precedence", () => {
  const prot = { ...cleanGuard, protected: true, reasons: "protected path: PRIVACY.md" };
  const sens = { ...cleanGuard, sensitive: true, reasons: "network call in src/net.js" };
  const v = (o) => ok({ ...goodVerdict, ...o });

  test("decision=changes + protected: changes first, CEO recorded as required, never merges", () => {
    const d = decide(base({ verdict: v({ decision: "changes", must_fix: ["fix it"] }), guard: prot }));
    assert.equal(d.action, "changes");
    assert.equal(d.ceoRequired, true);
    assert.ok(d.why.some((w) => /CEO approval/.test(w)));
  });
  test("decision=changes + sensitive: changes first, CEO recorded as required", () => {
    const d = decide(base({ verdict: v({ decision: "changes", must_fix: ["fix it"] }), guard: sens }));
    assert.equal(d.action, "changes");
    assert.equal(d.ceoRequired, true);
  });
  test("decision=changes on a clean change: changes, no CEO", () => {
    const d = decide(base({ verdict: v({ decision: "changes", must_fix: ["fix it"] }) }));
    assert.equal(d.action, "changes");
    assert.equal(d.ceoRequired, false);
  });
  test("decision=approve + protected: CEO, regardless of AI approval", () => {
    assert.equal(decide(base({ guard: prot })).action, "ceo");
  });
  test("decision=approve + sensitive: CEO, regardless of AI approval", () => {
    assert.equal(decide(base({ guard: sens })).action, "ceo");
  });
  test("decision=approve + protected + sensitive: CEO", () => {
    assert.equal(decide(base({ guard: { ...prot, sensitive: true } })).action, "ceo");
  });
  test("must_fix + needs-ceo: must-fix wins, CEO still required afterwards", () => {
    const d = decide(base({ verdict: v({ decision: "needs-ceo", must_fix: ["add a test"] }) }));
    assert.equal(d.action, "changes");
    assert.equal(d.ceoRequired, true);
  });
  test("must_fix + risky security: must-fix wins, CEO still required afterwards", () => {
    const d = decide(base({ verdict: v({ must_fix: ["add a test"], security: "new telemetry" }) }));
    assert.equal(d.action, "changes");
    assert.equal(d.ceoRequired, true);
  });
  test("must_fix + protected guard on an approve: changes, CEO required", () => {
    const d = decide(base({ verdict: v({ must_fix: ["rename var"] }), guard: prot }));
    assert.equal(d.action, "changes");
    assert.equal(d.ceoRequired, true);
  });
  test("failed tests on a protected change never merge", () => {
    const d = decide(base({ tests: "failure", guard: prot }));
    assert.equal(d.action, "changes");
    assert.equal(d.ceoRequired, true);
  });
  test("invalid verdict on a protected change is blocked, never merged", () => {
    assert.equal(decide(base({ verdict: validateVerdict("x"), guard: prot })).action, "blocked");
  });
  test("exhaustive: no protected or sensitive input ever yields merge", () => {
    const decisions = ["approve", "changes", "needs-ceo"];
    const fixes = [[], ["x"]];
    const securities = ["ok", "risk"];
    const testsList = ["success", "failure", "pending", "missing", "superseded"];
    let n = 0;
    for (const decision of decisions) for (const must_fix of fixes) for (const security of securities)
      for (const tests of testsList) for (const g of [prot, sens, { ...prot, sensitive: true }]) {
        const d = decide(base({ verdict: v({ decision, must_fix, security }), guard: g, tests }));
        assert.notEqual(d.action, "merge", JSON.stringify({ decision, must_fix, security, tests, g: g.reasons }));
        n++;
      }
    assert.equal(n, 180);
  });
  test("exhaustive: only clean approve with ok security, no must-fix, passing tests merges", () => {
    for (const decision of ["approve", "changes", "needs-ceo"]) for (const must_fix of [[], ["x"]])
      for (const security of ["ok", "OK", "risk"]) for (const tests of ["success", "failure"]) {
        const d = decide(base({ verdict: v({ decision, must_fix, security }), tests }));
        const expect = decision === "approve" && !must_fix.length && security.toLowerCase() === "ok" && tests === "success";
        assert.equal(d.action === "merge", expect, JSON.stringify({ decision, must_fix, security, tests }));
      }
  });
});

describe("route (with mocked gh)", () => {
  let dir, gh;
  let n = 0;
  const verdictFile = (v) => { const p = path.join(dir, `verdict-${n++}.json`); fs.writeFileSync(p, typeof v === "string" ? v : JSON.stringify(v)); return p; };
  // Rollup as the route job sees it: tests + the completed security check + its own running check.
  const rollup = (tests = "SUCCESS", security = "SUCCESS") => [
    { name: "company-tests", status: "COMPLETED", conclusion: tests },
    ...(security ? [{ name: "company-security-verdict", status: "COMPLETED", conclusion: security }] : []),
    { name: "company-pr-route", status: "IN_PROGRESS", conclusion: "" },
  ];
  const rules = (pr = goodPr, tests = "SUCCESS", security = "SUCCESS") => [
    { args: ["pr", "view", "7", "--repo", REPO, "--json", "headRefOid,statusCheckRollup"],
      stdout: { headRefOid: pr.headRefOid, statusCheckRollup: rollup(tests, security) } },
    { args: ["pr", "view", "7", "--repo", REPO, "--json", "*"], stdout: pr },
    { args: ["pr", "view", "7", "--repo", REPO], stdout: "Closes #3" },
    { args: ["issue", "view", "3"], stdout: { state: "OPEN", labels: [{ name: "status:review" }] } },
  ];
  const env = (over = {}) => ({
    PR: "7", HEAD_SHA: SHA, GUARD: "success", GUARD_COMPLETED: "true", PROTECTED: "false", SENSITIVE: "false",
    GUARD_REASONS: "clean", MODE: "on", CODE_REPO: REPO, VERDICT_PATH: verdictFile(goodVerdict),
    VERDICT_JOB_RESULT: "success", VERDICT_VALID: "success",
    TESTS_WAIT_SECONDS: "0", ...over,
  });
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "route-"));
    process.env.ROUTE_POLL_MS = "1";
    gh = fakeGh(rules());
  });

  test("clean PR merges only the reviewed commit", () => {
    const d = route(env());
    assert.equal(d.action, "merge");
    const merge = gh.calls().find((c) => c.args[1] === "merge");
    assert.ok(merge, "merge call expected");
    assert.deepEqual(merge.args.slice(-2), ["--match-head-commit", SHA]);
  });
  test("a failed repo check (build-mac) stops the automatic merge, like /approve", () => {
    const r = rules();
    r[0] = { ...r[0], stdout: { headRefOid: SHA, statusCheckRollup: [
      { name: "company-tests", status: "COMPLETED", conclusion: "SUCCESS" },
      { name: "build-mac", status: "COMPLETED", conclusion: "FAILURE" }] } };
    gh.reset(r);
    assert.equal(route(env()).action, "changes");
    assert.equal(gh.merged(), false);
  });
  test("a repo check still running at the deadline blocks", () => {
    const r = rules();
    r[0] = { ...r[0], stdout: { headRefOid: SHA, statusCheckRollup: [
      { name: "company-tests", status: "COMPLETED", conclusion: "SUCCESS" },
      { name: "build-mac", status: "IN_PROGRESS" }] } };
    gh.reset(r);
    assert.equal(route(env()).action, "blocked");
    assert.equal(gh.merged(), false);
  });
  test("two-job flow: clean PR merges after company-security-verdict succeeded (own route check ignored)", () => {
    const d = route(env());
    assert.equal(d.action, "merge");
    const merge = gh.calls().find((c) => c.args[1] === "merge");
    assert.deepEqual(merge.args.slice(-2), ["--match-head-commit", SHA]);
  });
  test("verdict job failed: no merge, even with a valid-looking verdict file", () => {
    for (const VERDICT_JOB_RESULT of ["failure", "cancelled", "skipped", "", undefined]) {
      gh.reset(rules());
      const d = route(env({ VERDICT_JOB_RESULT }));
      assert.equal(d.action, "blocked", String(VERDICT_JOB_RESULT));
      assert.equal(gh.merged(), false);
    }
  });
  test("verdict validation failed in the verdict job: no merge", () => {
    const d = route(env({ VERDICT_VALID: "failure" }));
    assert.equal(d.action, "blocked");
    assert.equal(gh.merged(), false);
  });
  test("verdict artifact missing in the route job: no merge", () => {
    const d = route(env({ VERDICT_PATH: path.join(dir, "verdict-in", "verdict.json") }));
    assert.equal(d.action, "blocked");
    assert.equal(gh.merged(), false);
  });
  test("company-security-verdict check absent from the PR: no merge", () => {
    gh.reset(rules(goodPr, "SUCCESS", null));
    const d = route(env());
    assert.equal(d.action, "blocked");
    assert.match(d.why.join(" "), /company-security-verdict/);
    assert.equal(gh.merged(), false);
  });
  test("company-security-verdict check failed: no merge", () => {
    gh.reset(rules(goodPr, "SUCCESS", "FAILURE"));
    assert.notEqual(route(env()).action, "merge");
    assert.equal(gh.merged(), false);
  });
  test("missing verdict file: no merge", () => {
    const d = route(env({ VERDICT_PATH: path.join(dir, "missing.json") }));
    assert.equal(d.action, "blocked");
    assert.equal(gh.merged(), false);
  });
  test("malformed verdict: no merge", () => {
    route(env({ VERDICT_PATH: verdictFile("{not json") }));
    assert.equal(gh.merged(), false);
  });
  test("risky security verdict: CEO label, no merge", () => {
    const d = route(env({ VERDICT_PATH: verdictFile({ ...goodVerdict, security: "sends worries to a server" }) }));
    assert.equal(d.action, "ceo");
    assert.equal(gh.merged(), false);
    assert.ok(gh.calls().some((c) => c.args.includes("--add-label") && c.args.includes("ceo-approval")));
  });
  test("failed tests: no merge", () => {
    gh.reset(rules(goodPr, "FAILURE"));
    const d = route(env());
    assert.equal(d.action, "changes");
    assert.equal(gh.merged(), false);
  });
  test("failed guard: no merge", () => {
    const d = route(env({ GUARD: "failure", GUARD_COMPLETED: "false" }));
    assert.equal(d.action, "blocked");
    assert.equal(gh.merged(), false);
  });
  test("guard outputs missing are treated as protected", () => {
    const d = route(env({ PROTECTED: "", SENSITIVE: "" }));
    assert.equal(d.action, "ceo");
    assert.equal(gh.merged(), false);
  });
  test("changes + protected: labels changes-requested and removes ceo-approval", () => {
    const d = route(env({ PROTECTED: "true", GUARD_REASONS: "protected path: PRIVACY.md",
      VERDICT_PATH: verdictFile({ ...goodVerdict, decision: "changes", must_fix: ["fix"] }) }));
    assert.equal(d.action, "changes");
    assert.equal(gh.merged(), false);
    assert.ok(gh.calls().some((c) => c.args.includes("--add-label") && c.args.includes("changes-requested")));
    assert.ok(gh.calls().some((c) => c.args.includes("--remove-label") && c.args.includes("ceo-approval")));
    const msg = gh.calls().find((c) => c.args[1] === "comment").args.at(-1);
    assert.match(msg, /also need CEO approval/);
  });
  test("protected path: routed to CEO, no merge", () => {
    const d = route(env({ PROTECTED: "true", GUARD_REASONS: "protected path: PRIVACY.md" }));
    assert.equal(d.action, "ceo");
    assert.equal(gh.merged(), false);
  });
  test("wrong target branch: no merge", () => {
    gh.reset(rules({ ...goodPr, baseRefName: "main" }));
    assert.equal(route(env()).action, "blocked");
    assert.equal(gh.merged(), false);
  });
  test("paused and off: no GitHub calls at all", () => {
    for (const MODE of ["pause", "off", ""]) {
      gh.reset(rules());
      assert.equal(route(env({ MODE })).action, "hold");
      assert.equal(gh.calls().length, 0, `mode ${MODE}`);
    }
  });
  test("invalid inputs fail closed", () => {
    assert.throws(() => route(env({ PR: "7; rm -rf /" })));
    assert.throws(() => route(env({ HEAD_SHA: "main" })));
    assert.throws(() => route(env({ CODE_REPO: "not a repo" })));
    assert.equal(gh.merged(), false);
  });
});
