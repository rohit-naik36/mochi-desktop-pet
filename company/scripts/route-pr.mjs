#!/usr/bin/env node
// After review: merge clean PRs into develop, request changes, route to the CEO, or block.
// Fails closed: anything missing, malformed, risky or unverifiable never merges.
//
//   node route-pr.mjs --validate <verdict.json>   exit 0 if the verdict is structurally valid, 1 if not
//   node route-pr.mjs                              route the PR (env below)
//
// Runs in the company-pr-route job, which `needs` the company-security-verdict job, so the required
// security check has already completed when anything merges.
//
// Env: PR (number), HEAD_SHA (reviewed commit), VERDICT_JOB_RESULT and VERDICT_VALID (from the
//      verdict job; both must be "success"), GUARD (guard step outcome), GUARD_COMPLETED,
//      PROTECTED, SENSITIVE, GUARD_REASONS, MODE (COMPANY_MODE), VERDICT_PATH (downloaded
//      artifact), CODE_REPO, GH_TOKEN, TESTS_WAIT_SECONDS.
//
// PRECEDENCE (first matching rule wins):
//   1. Company mode is not "on"                  -> hold     (nothing happens)
//   2. Guard did not complete                    -> blocked  (cannot classify the change)
//   3. Verdict job not successful, verdict artifact missing, or verdict malformed
//                                                -> blocked
//   4. Tests missing, pending or superseded      -> blocked
//      Tests failed                              -> changes
//      Any other check on the PR failed          -> changes  (same rule as CEO /approve: all green)
//      company-security-verdict check missing    -> blocked
//      Any other check still running at timeout  -> blocked
//   5. Outstanding must-fix items, or decision=changes
//                                                -> changes; if the change is ALSO protected,
//                                                   sensitive, security-flagged or needs-ceo,
//                                                   the result records ceoRequired=true and the
//                                                   comment says CEO approval will be needed
//                                                   after the fixes. CEO approval cannot override
//                                                   outstanding must-fix items.
//   6. Protected, sensitive, security != "ok", or decision=needs-ceo
//                                                -> ceo      (never merges without /approve)
//      This includes release-sync PRs (main -> develop): their version bump is protected, so
//      the CEO approves each one. There is no automatic exception.
//   7. decision=approve, all clean, PR open, mergeable, into develop, unchanged since review
//                                                -> merge (squash)
//      otherwise                                 -> blocked
import { pathToFileURL } from "node:url";
import {
  gh, ghJson, isPositiveInt, loadVerdict, prProblems, hasLabel, clean,
  REPO_RE, SHA_RE, PR_FIELDS, sleep,
} from "./lib.mjs";

export const TESTS_CHECK = "company-tests";
export const SECURITY_CHECK = "company-security-verdict";
export const ROUTE_CHECK = "company-pr-route"; // this job's own check: never waited on
/**
 * Pure decision. Inputs are already-gathered facts; output is the action and why.
 * Actions: merge | changes | ceo | blocked | hold.  `method` is set for merges.
 */
export function decide({ mode, verdict, guard, tests, pr, otherChecks = { state: "ok", failing: [] } }) {
  if (mode !== "on") return { action: "hold", why: [`company mode is "${mode || "unset"}"`] };
  if (!guard || guard.outcome !== "success" || guard.completed !== true) {
    return { action: "blocked", why: ["the guard could not complete, so the change cannot be classified"] };
  }
  if (!verdict || !verdict.ok) return { action: "blocked", why: ["the review did not produce a valid verdict", ...(verdict?.errors || [])] };
  if (tests === "superseded") return { action: "blocked", why: ["new commits were pushed after this review; the newer run decides"] };
  if (tests === "pending" || tests === "missing") return { action: "blocked", why: [`the ${TESTS_CHECK} check is ${tests}`] };
  if (tests !== "success") return { action: "changes", why: [`tests are ${tests || "unknown"}`], ceoRequired: guard.protected || guard.sensitive };
  if (otherChecks.state === "superseded") return { action: "blocked", why: ["new commits were pushed after this review; the newer run decides"] };
  if (otherChecks.state === "failed") return { action: "changes", why: otherChecks.failing.map((c) => `check failed: ${c}`), ceoRequired: guard.protected || guard.sensitive };
  if (otherChecks.state === "missing") return { action: "blocked", why: [`required check has not run: ${otherChecks.failing.join(", ")}`] };
  if (otherChecks.state !== "ok") return { action: "blocked", why: [`other checks are still running: ${otherChecks.failing.join(", ") || "unknown"}`] };

  const v = verdict.verdict;
  const escalate = [];
  if (v.decision === "needs-ceo") escalate.push(`reviewer: ${v.summary}`);
  if (v.security.trim().toLowerCase() !== "ok") escalate.push(`security: ${v.security}`);
  if (guard.protected || guard.sensitive) escalate.push(`guard: ${guard.reasons}`);

  const mustFix = [...v.must_fix];
  if (v.decision === "changes" || mustFix.length) {
    const why = [v.decision === "changes" ? "the reviewer asked for changes" : "the verdict still lists must-fix items", ...mustFix];
    if (escalate.length) why.push("after these are fixed, this change will also need CEO approval:", ...escalate);
    return { action: "changes", why, ceoRequired: escalate.length > 0 };
  }
  if (escalate.length) return { action: "ceo", why: escalate, ceoRequired: true };

  const problems = prProblems(pr.details, pr.expect);
  if (problems.length) return { action: "blocked", why: problems };
  return { action: "merge", method: "squash", why: ["tests passed, guard clean, reviewer approved with security ok"] };
}

/** Wait for the company-tests check on a PR head. Returns success|failure|pending|missing|superseded. */
export function testsResult(prNumber, codeRepo, headSha, waitSeconds) {
  const deadline = Date.now() + waitSeconds * 1000;
  for (;;) {
    const pr = ghJson(["pr", "view", String(prNumber), "--repo", codeRepo, "--json", "headRefOid,statusCheckRollup"]);
    if (pr.headRefOid !== headSha) return "superseded";
    const runs = (pr.statusCheckRollup || []).filter((c) => (c.name || c.context) === TESTS_CHECK);
    const done = runs.length && runs.every((c) => String(c.status || "").toUpperCase() === "COMPLETED");
    if (done) return runs.every((c) => String(c.conclusion || "").toUpperCase() === "SUCCESS") ? "success" : "failure";
    if (Date.now() >= deadline) return runs.length ? "pending" : "missing";
    sleep(Number(process.env.ROUTE_POLL_MS || 20000));
  }
}

/**
 * Wait for every other check on the PR head (CI from the repo's own workflows) and report whether
 * any failed. The review's own check is excluded because it is the job running this script.
 */
export function otherChecksResult(prNumber, codeRepo, headSha, waitSeconds, { exclude = [TESTS_CHECK, ROUTE_CHECK], required = [] } = {}) {
  const deadline = Date.now() + waitSeconds * 1000;
  const GOOD = new Set(["SUCCESS", "SKIPPED", "NEUTRAL"]);
  for (;;) {
    const pr = ghJson(["pr", "view", String(prNumber), "--repo", codeRepo, "--json", "headRefOid,statusCheckRollup"]);
    if (pr.headRefOid !== headSha) return { state: "superseded", failing: [] };
    const others = (pr.statusCheckRollup || []).filter((c) => !exclude.includes(c.name || c.context));
    const isStatus = (c) => c.__typename === "StatusContext" || (c.context && !c.name);
    const pending = others.filter((c) => (isStatus(c) ? String(c.state).toUpperCase() === "PENDING" : String(c.status || "").toUpperCase() !== "COMPLETED"));
    const failed = others.filter((c) => !pending.includes(c) && !GOOD.has(String(isStatus(c) ? c.state : c.conclusion).toUpperCase()));
    const names = (list) => list.map((c) => clean(c.name || c.context || "unnamed", 80));
    if (failed.length) return { state: "failed", failing: names(failed) };
    const absent = required.filter((r) => !others.some((c) => (c.name || c.context) === r));
    if (!pending.length && absent.length) return { state: "missing", failing: absent };
    if (!pending.length) return { state: "ok", failing: [] };
    if (Date.now() >= deadline) return { state: "pending", failing: names(pending) };
    sleep(Number(process.env.ROUTE_POLL_MS || 20000));
  }
}

function prDetails(prNumber, codeRepo) {
  for (let i = 0; i < 6; i++) {
    const d = ghJson(["pr", "view", prNumber, "--repo", codeRepo, "--json", PR_FIELDS]);
    if (d.mergeable !== "UNKNOWN") return d;
    sleep(Number(process.env.ROUTE_POLL_MS || 5000)); // GitHub computes mergeability lazily
  }
  return ghJson(["pr", "view", prNumber, "--repo", codeRepo, "--json", PR_FIELDS]);
}

export function route(env = process.env) {
  const { PR, HEAD_SHA, MODE } = env;
  const codeRepo = env.CODE_REPO || env.GITHUB_REPOSITORY;
  if (!isPositiveInt(PR)) throw new Error("PR must be a positive integer");
  if (!SHA_RE.test(HEAD_SHA || "")) throw new Error("HEAD_SHA must be a 40-character commit SHA");
  if (!REPO_RE.test(codeRepo || "")) throw new Error("CODE_REPO is not a valid owner/repo");

  if (MODE !== "on") {
    const d = { action: "hold", why: [`company mode is "${MODE || "unset"}"`] };
    console.log(JSON.stringify(d));
    return d;
  }

  // The verdict only counts if the security-verdict job itself succeeded and validated it.
  let verdict = loadVerdict(env.VERDICT_PATH || ".company/verdict.json");
  if (env.VERDICT_JOB_RESULT !== "success" || env.VERDICT_VALID !== "success") {
    verdict = { ok: false, verdict: null, errors: [`${SECURITY_CHECK} job ${env.VERDICT_JOB_RESULT || "result unknown"}, verdict validation ${env.VERDICT_VALID || "unknown"}`] };
  }
  const guard = {
    outcome: env.GUARD,
    completed: env.GUARD_COMPLETED === "true",
    protected: env.PROTECTED !== "false",   // anything but an explicit "false" counts as protected
    sensitive: env.SENSITIVE !== "false",
    reasons: clean(env.GUARD_REASONS || "", 1500),
  };

  const wait = Number(env.TESTS_WAIT_SECONDS || 1200);
  const tests = testsResult(PR, codeRepo, HEAD_SHA, wait);
  const otherChecks = tests === "success"
    ? otherChecksResult(PR, codeRepo, HEAD_SHA, wait, { required: [SECURITY_CHECK] })
    : { state: "ok", failing: [] };
  const details = prDetails(PR, codeRepo);
  const d = decide({ mode: MODE, verdict, guard, tests, otherChecks, pr: { details, expect: { codeRepo, base: "develop", headSha: HEAD_SHA } } });
  console.log(JSON.stringify(d));

  const R = ["--repo", codeRepo];
  const label = (add, remove = []) => {
    for (const l of remove) { try { gh(["pr", "edit", PR, ...R, "--remove-label", l]); } catch {} }
    gh(["pr", "edit", PR, ...R, "--add-label", add]);
  };
  const comment = (text) => gh(["pr", "comment", PR, ...R, "--body", text]);
  const bullets = d.why.map((w) => `- ${clean(w, 500)}`).join("\n");

  switch (d.action) {
    case "merge": {
      gh(["pr", "merge", PR, ...R, "--squash", "--delete-branch", "--match-head-commit", HEAD_SHA]);
      // Merging into develop does not auto-close issues. Close only linked issues that are in review.
      const body = gh(["pr", "view", PR, ...R, "--json", "body", "-q", ".body"]);
      for (const m of String(body).matchAll(/(?:closes|fixes|resolves)\s+#(\d{1,9})\b/gi)) {
        try {
          const issue = ghJson(["issue", "view", m[1], ...R, "--json", "labels,state"]);
          if (issue.state !== "OPEN" || !hasLabel(issue, "status:review")) continue;
          gh(["issue", "edit", m[1], ...R, "--add-label", "status:done", "--remove-label", "status:review"]);
          gh(["issue", "close", m[1], ...R, "--comment", `Merged to develop in #${PR}. Ships with the next release.`]);
        } catch {}
      }
      break;
    }
    case "ceo":
      label("ceo-approval", ["changes-requested", "review-blocked"]);
      comment(`Needs a CEO decision before merging:\n${bullets}\n\nReply \`/approve\` to merge (all checks must be green), \`/reject <why>\` to close, or \`/change <what>\`.`);
      break;
    case "changes":
      // Must-fix items come first; ceo-approval is removed so a CEO approval cannot skip them.
      label("changes-requested", ["review-blocked", "ceo-approval"]);
      comment(`Changes needed before this can merge:\n${bullets}`);
      break;
    case "blocked":
      label("review-blocked");
      comment(`Not merged. The review could not be completed safely:\n${bullets}\n\nA new push re-runs the review. The Chief of Staff will raise it in the brief if it stays blocked.`);
      break;
    default:
      break;
  }
  return d;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const argv = process.argv.slice(2);
  if (argv[0] === "--validate") {
    const r = loadVerdict(argv[1] || ".company/verdict.json");
    if (r.ok) console.log("verdict valid");
    else console.error(`verdict invalid: ${r.errors.join("; ")}`);
    process.exitCode = r.ok ? 0 : 1;
  } else {
    try { route(); } catch (e) { console.error(`route-pr failed closed: ${clean(e.message, 500)}`); process.exitCode = 1; }
  }
}
