#!/usr/bin/env node
// Validates the Release Manager's decision file and the release PR before the workflow merges it.
// Prints step outputs: release (true/false), pr, branch, head_sha. Exit 1 = do not merge.
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import { ghJson, writeOutputs, clean, REPO_RE, SHA_RE, PR_FIELDS, isPositiveInt } from "./lib.mjs";
import { testsResult, otherChecksResult } from "./route-pr.mjs";

export function checkReleaseDecision(raw) {
  let d;
  try { d = JSON.parse(raw); } catch { return { ok: false, problems: ["release.json is not valid JSON"] }; }
  if (!d || typeof d !== "object") return { ok: false, problems: ["release.json must be an object"] };
  if (d.release === false) return { ok: true, release: false, reason: clean(d.reason || "", 300) };
  const p = [];
  if (d.release !== true) p.push("release must be true or false");
  if (!/^\d+\.\d+\.\d+$/.test(String(d.version || ""))) p.push("version must look like X.Y.Z");
  if (!Number.isInteger(d.pr) || d.pr < 1) p.push("pr must be a positive integer");
  return p.length ? { ok: false, problems: p } : { ok: true, release: true, version: d.version, pr: d.pr };
}

export function releasePrProblems(pr, { codeRepo, version, prefix = "release/" }) {
  const p = [];
  if (!String(pr.url || "").toLowerCase().startsWith(`https://github.com/${codeRepo.toLowerCase()}/pull/`)) p.push(`PR does not belong to ${codeRepo}`);
  if (pr.isCrossRepository !== false) p.push("PR comes from another repository");
  if (pr.baseRefName !== "main") p.push(`release PR targets ${pr.baseRefName}, not main`);
  if (pr.headRefName !== `${prefix}v${version}`) p.push(`release branch must be ${prefix}v${version}`);
  if (pr.state !== "OPEN" || pr.isDraft) p.push("release PR is not open and ready");
  if (pr.mergeable !== "MERGEABLE") p.push(`release PR is not mergeable (${pr.mergeable})`);
  return p;
}

/** Release PRs merge only after company-tests passed on the exact release commit. */
export function waitForTests(prNumber, headSha, codeRepo, waitSeconds) {
  if (!isPositiveInt(String(prNumber)) || !SHA_RE.test(headSha || "") || !REPO_RE.test(codeRepo || "")) {
    return { ok: false, result: "invalid input" };
  }
  const result = testsResult(String(prNumber), codeRepo, headSha, waitSeconds);
  if (result !== "success") return { ok: false, result };
  // Same rule as everywhere else: every other check on the release commit must be green too.
  const others = otherChecksResult(String(prNumber), codeRepo, headSha, waitSeconds);
  if (others.state !== "ok") return { ok: false, result: `other checks ${others.state}: ${others.failing.join(", ")}` };
  return { ok: true, result };
}

function main() {
  const codeRepo = process.env.CODE_REPO || process.env.GITHUB_REPOSITORY;
  if (!REPO_RE.test(codeRepo || "")) { console.error("CODE_REPO invalid"); return 1; }
  if (process.argv[2] === "--wait-tests") {
    const r = waitForTests(process.argv[3], process.argv[4], codeRepo, Number(process.env.TESTS_WAIT_SECONDS || 1200));
    console.log(r.ok ? "company-tests and all other checks passed on the release commit" : `Not merging: ${r.result}`);
    return r.ok ? 0 : 1;
  }
  let raw;
  try { raw = fs.readFileSync(process.argv[2] || ".company/release.json", "utf8"); }
  catch { writeOutputs({ release: false }); console.log("No release decision written."); return 0; }
  const d = checkReleaseDecision(raw);
  if (!d.ok) { writeOutputs({ release: false }); console.error(`Release decision invalid: ${d.problems.join("; ")}`); return 1; }
  if (!d.release) { writeOutputs({ release: false }); console.log(`No release: ${d.reason}`); return 0; }
  const pr = ghJson(["pr", "view", String(d.pr), "--repo", codeRepo, "--json", PR_FIELDS]);
  const problems = releasePrProblems(pr, { codeRepo, version: d.version });
  if (problems.length) { writeOutputs({ release: false }); console.error(`Release PR refused: ${problems.join("; ")}`); return 1; }
  writeOutputs({ release: true, pr: d.pr, branch: pr.headRefName, head_sha: pr.headRefOid, version: d.version });
  console.log(`Release v${d.version} PR #${d.pr} ready at ${pr.headRefOid}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try { process.exitCode = main(); } catch (e) { console.error(`release-check failed closed: ${clean(e.message, 400)}`); process.exitCode = 1; }
}
