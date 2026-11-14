// Static checks on the company workflows (text-based, so no YAML library is needed).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, "../workflows");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".yml"));
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");
const linkedin = path.resolve(here, "../../growth/linkedin/linkedin-autopilot.yml");

/** Split "jobs:" into { name: text } using two-space indentation. */
function jobs(text) {
  const body = text.slice(text.indexOf("\njobs:\n") + 7);
  const out = {};
  let cur = null;
  for (const line of body.split("\n")) {
    const m = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (m) { cur = m[1]; out[cur] = ""; continue; }
    if (cur) out[cur] += line + "\n";
  }
  return out;
}

describe("company workflows", () => {
  test("there are eight company workflows", () => assert.equal(files.length, 8, files.join(", ")));
  for (const f of files) {
    const text = read(f);
    test(`${f}: default permissions are empty`, () => assert.match(text, /^permissions: \{\}$/m));
    test(`${f}: no broad agent tool grants`, () => {
      for (const bad of ["Bash(gh:*)", "Bash(git:*)", "Bash(node:*)", "Bash(npm run:*)"]) assert.ok(!text.includes(bad), bad);
    });
    for (const [name, job] of Object.entries(jobs(text))) {
      const usesClaude = job.includes("anthropics/claude-code-action");
      test(`${f}/${name}: id-token only where claude-code-action runs`, () => {
        assert.equal(/id-token: write/.test(job), usesClaude);
      });
      test(`${f}/${name}: job declares its own minimal permissions`, () => assert.match(job, /\n    permissions:\n/));
      test(`${f}/${name}: respects COMPANY_MODE`, () => {
        if (f === "company-ceo-commands.yml") return assert.ok(!/COMPANY_MODE/.test(job.split("steps:")[0]), "CEO commands must work in every mode");
        if (f === "company-standup.yml") {
          assert.match(job, /vars\.COMPANY_MODE == 'on' \|\| vars\.COMPANY_MODE == 'pause'/);
          assert.match(job, /if: vars\.COMPANY_MODE == 'pause'/);
          return;
        }
        assert.match(job, /vars\.COMPANY_MODE == 'on'/);
      });
      if (usesClaude) {
        test(`${f}/${name}: agents never receive the code-repo token`, () => {
          const claudeStep = job.slice(job.indexOf("anthropics/claude-code-action"));
          const stepEnd = claudeStep.indexOf("\n      - ", 1);
          assert.ok(!claudeStep.slice(0, stepEnd === -1 ? undefined : stepEnd).includes("COMPANY_GH_TOKEN"));
          assert.ok(!/HQ_GH_TOKEN: \$\{\{ secrets\.COMPANY_GH_TOKEN/.test(job), "job env must use secrets.HQ_GH_TOKEN");
        });
      }
    }
  }

  test("PR review runs from the base branch and never executes PR code", () => {
    const t = read("company-pr-review.yml");
    assert.match(t, /pull_request_target:/);
    assert.match(t, /head\.repo\.full_name == github\.repository/);
    assert.match(t, /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}\n\s+path: trusted-final/);
    assert.ok(!/npm (ci|test|install)/.test(t), "no npm in the privileged review");
    assert.ok(!/node pr\//.test(t), "never runs scripts from the PR checkout");
    assert.match(t, /cancel-in-progress: false/);
  });
  describe("PR review: verdict and routing are separate jobs (no circular required check)", () => {
    const t = read("company-pr-review.yml");
    const j = jobs(t);
    const verdict = j.verdict, route = j.route;
    test("both jobs exist", () => { assert.ok(verdict); assert.ok(route); assert.equal(Object.keys(j).length, 2); });
    test("the required check is produced by the first job, exactly company-security-verdict", () => {
      assert.match(verdict, /^    name: company-security-verdict$/m);
      assert.match(route, /^    name: company-pr-route$/m);
      assert.ok(!/company-security-verdict/.test(route.match(/^    name: .*$/m)[0]));
    });
    test("routing job explicitly depends on the verdict job", () => {
      assert.match(route, /^    needs: verdict$/m);
      assert.ok(!/^    needs:/m.test(verdict), "the verdict job depends on nothing");
    });
    test("routing starts only after the verdict job has completed, and is skipped with it", () => {
      const cond = route.match(/^    if: >-\n([\s\S]*?)\n    runs-on/m)[1];
      assert.match(cond, /always\(\)/);
      assert.match(cond, /needs\.verdict\.result != 'skipped'/);
      assert.match(cond, /vars\.COMPANY_MODE == 'on'/);
      assert.match(cond, /head\.repo\.full_name == github\.repository/);
    });
    test("the verdict job never merges or routes", () => {
      assert.ok(!/gh pr merge/.test(verdict));
      assert.ok(!/route-pr\.mjs"?\s*$/m.test(verdict), "only route-pr.mjs --validate may run in the verdict job");
      assert.match(verdict, /route-pr\.mjs --validate/);
      assert.ok(!/COMPANY_GH_TOKEN/.test(verdict), "the merge token is not in the verdict job");
    });
    test("the verdict job publishes the verdict; the route job downloads the same artifact", () => {
      const name = /name: (company-verdict-\$\{\{ github\.event\.pull_request\.number \}\}-\$\{\{ github\.event\.pull_request\.head\.sha \}\})/;
      assert.match(verdict, /actions\/upload-artifact@/);
      assert.match(route, /actions\/download-artifact@/);
      assert.equal(verdict.match(name)[1], route.match(name)[1]);
    });
    test("the route job uses trusted base-commit scripts and the verdict job's results", () => {
      assert.match(route, /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}\n\s+path: trusted\n/);
      assert.match(route, /run: node trusted\/company\/scripts\/route-pr\.mjs\n/);
      for (const v of ["VERDICT_JOB_RESULT: ${{ needs.verdict.result }}", "VERDICT_VALID: ${{ needs.verdict.outputs.verdict_valid }}",
                       "GUARD: ${{ needs.verdict.outputs.guard_outcome }}", "HEAD_SHA: ${{ github.event.pull_request.head.sha }}",
                       "VERDICT_PATH: verdict-in/verdict.json"]) assert.ok(route.includes(v), v);
      assert.ok(!/claude-code-action/.test(route), "no AI in the routing job");
    });
    test("guard results reach the route job as runner-set job outputs", () => {
      assert.match(verdict, /outputs:\n\s+guard_outcome: \$\{\{ steps\.guard\.outcome \}\}/);
      assert.match(verdict, /verdict_valid: \$\{\{ steps\.verdict\.outcome \}\}/);
    });
    test("the develop ruleset requires the verdict check but not the routing check (would be circular)", () => {
      const cfg = JSON.parse(fs.readFileSync(path.resolve(here, "../config.json"), "utf8"));
      assert.ok(cfg.rulesets.develop.includes("company-security-verdict"));
      assert.ok(!cfg.rulesets.develop.includes("company-pr-route"));
    });
  });
  test("PR tests run without secrets", () => {
    const t = read("company-pr-tests.yml");
    assert.match(t, /\n  pull_request:\n/);
    assert.ok(!/secrets\.[A-Z_]/.test(t));
    assert.match(t, /name: company-tests/);
  });
  test("company-tests is produced for PRs into develop AND main", () => {
    const t = read("company-pr-tests.yml");
    const branches = t.match(/pull_request:\n\s+branches: \[([^\]]+)\]/)[1].split(",").map((b) => b.trim());
    assert.deepEqual(branches.sort(), ["develop", "main"]);
  });
  test("ruleset required checks match the checks the workflows actually produce", () => {
    const cfg = JSON.parse(fs.readFileSync(path.resolve(here, "../config.json"), "utf8"));
    const produced = {}; // branch -> Set(check names)
    for (const f of files) {
      const t = read(f);
      const trig = t.match(/\n  (pull_request|pull_request_target):\n\s+branches: \[([^\]]+)\]/);
      if (!trig) continue;
      for (const branch of trig[2].split(",").map((b) => b.trim())) {
        for (const job of Object.values(jobs(t))) {
          const name = job.match(/^    name: (\S+)/m);
          if (name) (produced[branch] ||= new Set()).add(name[1]);
        }
      }
    }
    for (const branch of ["develop", "main"]) {
      for (const check of cfg.rulesets[branch]) {
        assert.ok(produced[branch]?.has(check), `${check} is required on ${branch} but no workflow produces it for PRs into ${branch}`);
      }
    }
    assert.deepEqual(cfg.requiredChecks.sort(), [...cfg.rulesets.develop].sort(), "CEO approvals (develop) require the develop ruleset checks");
  });
  test("release never pushes to develop or main; it syncs through a PR", () => {
    const t = read("company-release.yml");
    assert.ok(!/git push[^\n]*\s(develop|main)\s*$/m.test(t), "no direct push to develop/main");
    assert.ok(!/HEAD:(refs\/heads\/)?(develop|main)\b/.test(t));
    assert.match(t, /refs\/heads\/\$\{BRANCH\}/);
    assert.match(t, /BRANCH="sync\/v\$\{VERSION\}"/);
    assert.match(t, /gh pr create --repo "\$REPO" --base develop --head "\$BRANCH"/);
  });
  test("release waits for company-tests before merging into main", () => {
    const t = read("company-release.yml");
    const wait = t.indexOf("release-check.mjs --wait-tests");
    const merge = t.indexOf("gh pr merge");
    assert.ok(wait > 0 && merge > wait, "wait step must come before the merge");
    assert.match(t, /--match-head-commit "\$HEAD_SHA"/);
  });
  test("CEO commands receive the company mode", () => {
    assert.match(read("company-ceo-commands.yml"), /COMPANY_MODE: \$\{\{ vars\.COMPANY_MODE \}\}/);
  });
  describe("executive tasks keep web access and HQ access apart", () => {
    const j = jobs(read("company-exec.yml"));
    test("four jobs: pick, research, write, release", () => assert.deepEqual(Object.keys(j), ["pick", "research", "write", "release"]));
    test("research has web tools and no token reaches the AI step", () => {
      assert.match(j.research, /WebSearch,WebFetch/);
      const ai = j.research.slice(j.research.indexOf("anthropics/claude-code-action"));
      assert.ok(!/HQ_GH_TOKEN|COMPANY_GH_TOKEN/.test(ai));
      assert.ok(!/\n    env:\n/.test(j.research));
    });
    test("write has HQ access and no web", () => {
      assert.ok(!/WebSearch|WebFetch/.test(j.write.match(/--allowedTools "([^"]+)"/)[1]));
      assert.ok(!/COMPANY_GH_TOKEN/.test(j.write));
    });
    test("pick and release run no AI", () => { for (const k of ["pick", "release"]) assert.ok(!/claude-code-action/.test(j[k]), k); });
  });
  test("LinkedIn autopilot stops when the company is paused or off", () => {
    assert.match(fs.readFileSync(linkedin, "utf8"), /vars\.COMPANY_MODE == 'on'/);
  });
  test("third-party actions pinned to commit SHAs", (t) => {
    const all = [...files.map(read), fs.readFileSync(linkedin, "utf8")].join("\n");
    const unpinned = [...new Set([...all.matchAll(/uses: ([\w.-]+\/[\w.-]+)@(?![0-9a-f]{40}\b)(\S+)/g)].map((m) => `${m[1]}@${m[2]}`))];
    if (unpinned.length) t.todo(`unpinned until company/scripts/pin-actions.sh is run: ${unpinned.join(", ")}`);
  });
});
