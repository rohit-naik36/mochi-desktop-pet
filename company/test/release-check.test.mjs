import { test } from "node:test";
import { fakeGh } from "./helpers.mjs";
import assert from "node:assert/strict";
import { checkReleaseDecision, releasePrProblems, waitForTests } from "../scripts/release-check.mjs";

const REPO = "rohit-naik36/mochi-desktop-pet";
const pr = { url: `https://github.com/${REPO}/pull/40`, isCrossRepository: false, baseRefName: "main",
             headRefName: "release/v0.13.0", state: "OPEN", isDraft: false, mergeable: "MERGEABLE" };

test("release decision must be well-formed", () => {
  assert.equal(checkReleaseDecision("{oops").ok, false);
  assert.equal(checkReleaseDecision(JSON.stringify({ release: true, version: "next", pr: 4 })).ok, false);
  assert.equal(checkReleaseDecision(JSON.stringify({ release: true, version: "0.13.0", pr: "4" })).ok, false);
  assert.deepEqual(checkReleaseDecision(JSON.stringify({ release: false, reason: "nothing new" })).release, false);
  assert.equal(checkReleaseDecision(JSON.stringify({ release: true, version: "0.13.0", pr: 40 })).ok, true);
});

test("release PR must be the right branch into main from this repo", () => {
  assert.deepEqual(releasePrProblems(pr, { codeRepo: REPO, version: "0.13.0" }), []);
  assert.ok(releasePrProblems({ ...pr, baseRefName: "develop" }, { codeRepo: REPO, version: "0.13.0" }).length);
  assert.ok(releasePrProblems({ ...pr, headRefName: "agent/9-x" }, { codeRepo: REPO, version: "0.13.0" }).length);
  assert.ok(releasePrProblems({ ...pr, isCrossRepository: true }, { codeRepo: REPO, version: "0.13.0" }).length);
  assert.ok(releasePrProblems({ ...pr, url: "https://github.com/x/y/pull/1" }, { codeRepo: REPO, version: "0.13.0" }).length);
});

test("release PR into main merges only after company-tests passed on the exact commit", () => {
  process.env.ROUTE_POLL_MS = "1";
  const SHA = "c".repeat(40);
  const gh = fakeGh();
  const check = (status, conclusion, head = SHA) => gh.reset([{ args: ["pr", "view", "40", "--repo", REPO, "--json", "headRefOid,statusCheckRollup"],
    stdout: { headRefOid: head, statusCheckRollup: status ? [{ name: "company-tests", status, conclusion }] : [] } }]);
  check("COMPLETED", "SUCCESS");
  assert.deepEqual(waitForTests(40, SHA, REPO, 0), { ok: true, result: "success" });
  check("COMPLETED", "FAILURE");
  assert.equal(waitForTests(40, SHA, REPO, 0).ok, false);
  check("IN_PROGRESS", "");
  assert.equal(waitForTests(40, SHA, REPO, 0).result, "pending");
  check(null);
  assert.equal(waitForTests(40, SHA, REPO, 0).result, "missing");
  check("COMPLETED", "SUCCESS", "d".repeat(40));
  assert.equal(waitForTests(40, SHA, REPO, 0).result, "superseded");
  assert.equal(waitForTests("40; rm", SHA, REPO, 0).ok, false);
  gh.reset([{ args: ["pr", "view", "40", "--repo", REPO, "--json", "headRefOid,statusCheckRollup"],
    stdout: { headRefOid: SHA, statusCheckRollup: [{ name: "company-tests", status: "COMPLETED", conclusion: "SUCCESS" },
                                                   { name: "build-mac", status: "COMPLETED", conclusion: "FAILURE" }] } }]);
  const r = waitForTests(40, SHA, REPO, 0);
  assert.equal(r.ok, false, "a failed build-mac on the release commit blocks the release");
  assert.match(r.result, /build-mac/);
  assert.equal(gh.merged(), false);
});
