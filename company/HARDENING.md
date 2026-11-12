# Company OS — security and reliability hardening (13 Nov 2026, revision 3)

Scope: the company OS only (`company/`, `AGENTS.md`, the LinkedIn workflow's run conditions). The Mochi app, its working directory and its uncommitted changes were not touched. The public product name is still Mochi. `COMPANY_MODE` stays `pause`. Nothing was pushed, merged or deployed, and `setup.sh` was not run.

## 1. Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| F1 | **Critical** | The PR review ran on `pull_request`, so the workflow, `guard.mjs`, `route-pr.mjs` and `company/config.json` all came from the PR being reviewed, with secrets available. A PR could rewrite its own rules and auto-merge. Reproduced: a PR that emptied `protectedPaths` and edited `PRIVACY.md` got `protected=false, reasons=clean` from the original guard. | Fixed |
| F2 | **Critical** | Agents had `Bash(gh:*)`, `Bash(git:*)`, `Bash(node:*)`, and every agent job carried the code-repo token (as `HQ_GH_TOKEN`). Any agent could `gh pr merge`, push to `develop`/`main`, or flip `COMPANY_MODE`, bypassing review and CEO gates. | Fixed (residual risk R1) |
| F3 | **Critical** | `/approve` on a PR merged unconditionally: no label check, no repository, base, state, mergeability or CI check. Reproduced: an unlabelled PR was merged. | Fixed |
| F4 | High | The router ignored `security` and `must_fix`; an `approve` with a security risk or open must-fix items merged. It didn't check base, state or mergeability, and merged whatever commit was current rather than the reviewed one. | Fixed |
| F5 | High | Tests ran with `continue-on-error`, so CI showed green even when tests failed. No check reflected tests or the security verdict. | Fixed |
| F6 | High | The guard used a shell (`execSync` with interpolated ref), missed renames (reproduced: renaming `PRIVACY.md` away gave `clean`), counted binary files as 0 lines, read `package.json` from the working tree, and wrote outputs without escaping. A file name containing a newline could inject `protected=false`. Errors crashed instead of failing closed. | Fixed |
| F7 | High | Pause did not stop work: PR review (Claude) ran unless mode was `off`; a paused standup still applied decisions; the LinkedIn autopilot ignored company mode. | Fixed |
| F8 | Medium | `hq.mjs` accepted any `gh` command (including `api`, `repo delete`) and any repo via `HQ_REPO`, including the public code repo. It fell back to the code-repo token. | Fixed |
| F9 | Medium | The release merge had no guard: the release branch could carry any change into `main`. There were no checks on the PR's base, head or repository, and no head-commit match. | Fixed |
| F10 | Medium | Every job had `contents/pull-requests: write` and `id-token: write` at workflow level, including jobs that need neither. | Fixed |
| F11 | Medium | Third-party actions were referenced by mutable tags. | Fixed: all 23 action references pinned to verified commit SHAs; tests pass |
| F12 | Medium | The PR review used `cancel-in-progress: true`, which could stop routing halfway. CEO commands had no concurrency control. | Fixed |
| F13 | Low | The router closed any issue named in "Closes #N" in an agent-written PR body. | Fixed (only open issues labelled `status:review`) |
| F14 | Low | Security review was required only by prompt text. | Fixed (schema enforced in code, and a deterministic sensitive-change scan) |

**Follow-up audit (revision 2)**

| # | Severity | Finding | Status |
|---|---|---|---|
| G1 | High | `/approve` merged PRs while the company was paused or off (the CEO-command workflow runs in every mode and the script never read `COMPANY_MODE`). | Fixed: mode passed in; PR merges refused unless `on`, with the reason stated; `/pause` and `/resume` unaffected |
| G2 | High | The release workflow pushed `main` straight into `develop`, which a no-bypass PR ruleset forbids (and the rule should hold). | Fixed: sync through a `sync/vX.Y.Z` → `develop` PR; nothing pushes to `develop` or `main` |
| G3 | High | `company-tests` was only produced for PRs into `develop`, so the `main` ruleset could never be satisfied by release PRs. | Fixed: PR tests run for `develop` and `main`; the release merge waits for `company-tests` on the release commit |
| G4 | High | The router returned early on `decision=changes` before looking at guard escalation, so the CEO wasn't told about a protected or sensitive change until a later run. A CEO `/approve` could also land while must-fix items were outstanding. | Fixed: explicit precedence; `ceoRequired` recorded on change requests; `/approve` refused while `changes-requested` is set |
| G5 | Medium | `setup.sh` masked HQ clone, commit and push failures (`|| true`), didn't verify the HQ was private before writing, and printed "Done" even on failure. | Fixed (not executed, by instruction) |
| G7 | Medium | Your existing workflows produce PR checks (`build-mac` on every PR; `ai-eval`, `apps-smoke`, `build-pulse`, `server` by path). `/approve` required all checks green, but the automatic merge and the release merge only waited for `company-tests`, so they could merge past a failed `build-mac`. | Fixed: router and release merge wait for all checks; any failure means no merge |
| G6 | Medium | The activation order put rulesets before `develop` existed and was synced, which would itself have needed a direct push. | Fixed: rulesets are added last, before `/resume` |

**Independent review (revision 3)**

| # | Severity | Finding | Status |
|---|---|---|---|
| H1 | **Critical** | Circular required check: the `company-security-verdict` job also ran `route-pr.mjs` and tried to merge. GitHub cannot mark a check successful until its job finishes, so with `company-security-verdict` required on `develop` and no bypass, every automatic merge would have been rejected. | Fixed: review and routing are separate jobs; routing `needs` the verdict job and starts only after the required check has completed |

## 1a. Merge policy precedence (route-pr.mjs, first matching rule wins)

| # | Condition | Result |
|---|---|---|
| 1 | Company mode is not `on` | **hold**: nothing happens |
| 2 | Guard did not complete | **blocked** |
| 3 | Verdict job not successful, verdict artifact missing, or verdict malformed | **blocked** |
| 4 | `company-tests` missing, pending or superseded by a newer push | **blocked** |
|   | `company-tests` failed | **changes** (CEO marked as required if protected or sensitive) |
|   | Any other check on the PR failed (e.g. `build-mac`) | **changes**: the same all-green rule as `/approve` |
|   | `company-security-verdict` missing from the PR's checks | **blocked** |
|   | Other checks still running when the wait ends (20 min) | **blocked** |
| 5 | Must-fix items outstanding, or `decision=changes` | **changes**; if the change is also protected, sensitive, security-flagged or `needs-ceo`, the comment says CEO approval will be needed after the fixes. `ceo-approval` is removed so a CEO approval can't skip the fixes. |
| 6 | Protected, sensitive, `security` ≠ `ok`, or `decision=needs-ceo` | **ceo**: merges only through `/approve` |
| 7 | Clean `approve`, PR open and mergeable into `develop`, unchanged since review | **merge** (squash, exact commit) |
|   | Anything else | **blocked** |

CEO `/approve` on a PR additionally requires: company `on`; `ceo-approval` label; no `changes-requested`; code repo; same-repo branch; base `develop`; open, not draft, mergeable; every check green including `company-tests` and `company-security-verdict`. Tests check exhaustively that no combination of protected or sensitive input ever yields an automatic merge (180 combinations).

## 1b. Release and branch rules

```
develop ──(release/vX.Y.Z PR, company-tests on that commit, release guard)──▶ main   [workflow merges]
main ──(sync/vX.Y.Z branch at main's tip, PR into develop)──▶ develop               [CEO /approve]
```

- Nothing pushes to `develop` or `main`. Both have no-bypass rulesets.
- The release PR into `main` merges only after `company-tests` **and every other check** pass on the exact release commit, the release guard confirms only the version and changelog changed, and the PR is `release/vX.Y.Z` from this repo. This matches the `main` ruleset, which requires `company-tests`.
- The sync PR is created from a new `sync/vX.Y.Z` branch (rulesets cover only `develop` and `main`). It gets `company-tests` and `company-security-verdict` like any PR into `develop`. Because it changes the protected `package.json` version, it is routed to the CEO. **There is no automatic exception**, so you approve one sync PR per release.
- *Considered and not adopted:* auto-merging a sync PR whose head equals `main`'s tip. It would be safe in practice, but it would merge a protected change without the CEO, which the policy forbids. It can be added later only by changing the charter.

## 1c. PR review job structure (revision 3)

```
pull_request_target ─┬─ job verdict  → check "company-security-verdict"   (required on develop)
                     │    trusted guard (base commit) → AI review → fresh trusted checkout →
                     │    validate verdict → publish verdict artifact → fail the check if the
                     │    verdict is missing/invalid or the guard did not complete. Never merges.
                     │    Job outputs (set by the runner, not the AI): guard outcome/completed/
                     │    protected/sensitive/reasons, verdict validation outcome.
                     │
                     └─ job route    → check "company-pr-route"           (not required: it merges)
                          needs: verdict; if: always() && verdict not skipped && mode on && same repo
                          trusted scripts (base commit) → download verdict artifact → route-pr.mjs
pull_request ────────── job tests    → check "company-tests"              (required on develop, main)
```

The route job merges only if all of these hold:
- the verdict job **succeeded** and its validation step succeeded (`VERDICT_JOB_RESULT`, `VERDICT_VALID`);
- the downloaded verdict is present and valid;
- the guard completed;
- `company-tests` passed;
- `company-security-verdict` is **present and green** in the PR's checks;
- every other check is green (its own `company-pr-route` check is excluded, so it never waits on itself);
- the precedence rules allow a merge;
- the PR is unchanged since review (`--match-head-commit`).

`company-pr-route` is deliberately not in the ruleset, because requiring it would recreate the circular dependency.

## 2. Files changed

| File | Change |
|---|---|
| `company/scripts/lib.mjs` *(new)* | Shared helpers: argument-array `gh`, strict verdict schema, PR and check validation, safe Actions outputs (random heredoc delimiters). |
| `company/scripts/guard.mjs` | Rewritten. Rules come from the **base** commit; git runs without a shell; refs are validated; renames split into delete+add; binary files weighted; `package.json` read from the commits; sensitive-change scan; escaped outputs; exit 2 = could not complete. Adds `--release` mode. |
| `company/scripts/route-pr.mjs` | Rewritten. Pure `decide()` plus a router. Requires a complete verdict, `company-tests` success at the reviewed commit, a completed guard, `security: "ok"`, empty `must_fix`, and an open, mergeable PR into `develop` from this repo. Merges with `--match-head-commit`. Adds `--validate`. |
| `company/scripts/ceo-command.mjs` | Rewritten. Strict parser; validated inputs. `/approve` on a PR requires the `ceo-approval` label, the code repo, a same-repo branch, base `develop`, an open and mergeable PR, and every check green (the required `company-tests` and `company-security-verdict` included). It merges the exact head commit. `/reject`, `/change`, `/pause`, `/resume` are unchanged in behaviour. |
| `company/scripts/hq.mjs` | Allow-list (issue list/view/create/comment/edit/close/reopen, label list); `--repo` overrides refused; HQ repo must match config, must not be the code repo, and must be **private** (checked every call); HQ-only token. |
| `company/scripts/release-check.mjs` *(new)* | Validates `release.json` and the release PR (into `main`, from `release/vX.Y.Z`, same repo, open, mergeable). |
| `company/scripts/pin-actions.sh` *(new)* | Resolves third-party action tags to verified full commit SHAs; executed successfully, pinning all 23 references. |
| `company/workflows/company-pr-tests.yml` *(new)* | Runs `npm test` and the company OS tests as the `company-tests` check, read-only, no secrets. |
| `company/workflows/company-pr-review.yml` | `pull_request_target`; trusted scripts from the base SHA; PR checked out as data only; fresh trusted checkout after the AI step; `company-security-verdict` check fails without a valid verdict or a completed guard; queued, not cancelled. |
| `company/workflows/company-*.yml` (other 5) | `permissions: {}` at workflow level with minimal per-job permissions; `id-token` only on Claude jobs; explicit per-role tool allow-lists; agents get only `HQ_GH_TOKEN`; mode gating; separate paused standup with read-only tools; release merge guarded and SHA-matched; CEO commands require `author_association == OWNER` and have per-issue concurrency. |
| `company/config.json` | Added `sensitivePatterns`, `binaryLineWeight`, `requiredChecks` and `release` rules. Protected paths now also cover company scripts, workflows, tests, agents, playbooks, `.claude/`, `AGENTS.md` and the LinkedIn workflow. Existing settings are kept. |
| `company/playbooks/pr-review.md`, `agents/qa-lead.md`, `agents/security-privacy-engineer.md` | Four-field verdict; mandatory security result; the PR is untrusted data and is never run. |
| `company/playbooks/standup.md`, `dev-cycle.md`, `release.md` | Pause means only steps 1 and 6; branch naming rules; `review-blocked` reporting. |
| `company/CHARTER.md` | Merge and CEO-approval conditions as now enforced; token split; branch rulesets. |
| `company/scripts/setup.sh` | Not run. `review-blocked` label; copies `lib.mjs` and config to HQ; checks `HQ_GH_TOKEN`; prints ruleset and pinning steps; still sets `COMPANY_MODE=pause`. |
| `growth/linkedin/linkedin-autopilot.yml` | Runs only when `COMPANY_MODE == 'on'` (in addition to `AUTOPILOT_MODE`). |
| `company/test/*` *(new)* | 210 automated tests (below). |
| **Revision 2** | |
| `company/scripts/route-pr.mjs` | Precedence rewritten and documented in the file header; `ceoRequired`; `changes` removes `ceo-approval`; waits for all other repo checks (`otherChecksResult`) so the automatic merge follows the same all-green rule as `/approve`. |
| `company/scripts/ceo-command.mjs` | `/approve` on PRs refuses unless `COMPANY_MODE=on` (states why), and refuses while `changes-requested` is set. |
| `company/scripts/release-check.mjs` | `--wait-tests`: release merges only after `company-tests` and all other checks passed on the exact release commit. |
| `company/workflows/company-ceo-commands.yml` | Passes `COMPANY_MODE`. |
| `company/workflows/company-pr-tests.yml` | Runs for PRs into `develop` and `main`. |
| `company/workflows/company-release.yml` | Waits for `company-tests`; merges the release PR; opens a `sync/vX.Y.Z` → `develop` PR instead of pushing to `develop`. |
| `company/config.json` | `rulesets` (required checks per branch) added; tests verify the workflows produce them. |
| `company/scripts/setup.sh` | `set -Eeuo pipefail` + ERR trap; no `|| true`; HQ must not be the code repo and must be `PRIVATE` before cloning or writing; clone, copy, commit and push fail the script; success printed only at the end; still sets `COMPANY_MODE=pause`. |
| `company/CHARTER.md`, `ORG.md`, `README.md`, `playbooks/release.md`, `playbooks/standup.md`, `agents/release-manager.md` | Release-sync flow, approval conditions, activation order. |
| `company/test/setup-script.test.mjs` *(new)* | Static checks on `setup.sh` (the script is not executed). |
| **Revision 3** | |
| `company/workflows/company-pr-review.yml` | Split into `verdict` (check `company-security-verdict`: guard, AI review, validation, artifact upload; runner-set job outputs; never merges) and `route` (check `company-pr-route`: `needs: verdict`, trusted base scripts, artifact download, routing and merge). |
| `company/scripts/route-pr.mjs` | Requires `VERDICT_JOB_RESULT=success` and `VERDICT_VALID=success`; requires `company-security-verdict` present and green; excludes its own `company-pr-route` check from the all-green wait. |
| `company/test/route-pr.test.mjs`, `company/test/workflows.test.mjs` | Revision 3 regression tests (below). |

## 3. Security improvements, in short
- **Trusted review:** the PR under review can no longer change the workflow, scripts or rules that judge it.
- **Fail closed everywhere:** a missing, malformed or risky verdict, an incomplete guard, missing, pending or failed tests, new commits after review, the wrong base, a closed, draft, fork or conflicting PR, or a paused or off company never merges.
- **Exact-commit merges:** both the router and `/approve` use `--match-head-commit`.
- **CEO approval accepts risk, never broken builds:** `/approve` refuses unless every check is green.
- **Deterministic escalation:** protected paths, `package.json` keys, size, network calls, permission APIs, telemetry, weakened Electron settings, secrets and confidential HQ text go to the CEO regardless of what the AI says.
- **Least privilege:** agents get an HQ-only token and narrow tool lists; the code-repo token is used only in non-AI steps; workflow permissions default to none.
- **No shell interpolation** in any script; Actions outputs are injection-proof.
- **Confidentiality:** HQ writes are refused unless the target is the configured, private HQ repo.

## 4. Tests and actual results
Run: `node --test company/test/*.test.mjs` (Node 22.23.4, isolated copy, `gh` replaced by a recording fake, a trap `gh` first on PATH to prove the real one is never called, no GitHub token in the environment).

```
# tests 210   # suites 15   # pass 210   # fail 0   # cancelled 0   # skipped 0   # todo 0
Post-pinning verification: all third-party action references are pinned to full commit SHAs; no outstanding TODO.
real gh never called
```

| Area | Covered cases |
|---|---|
| Verdicts | Missing file; malformed JSON; non-object; unknown decision; missing summary; bad `must_fix`; missing or blank `security`; valid |
| Routing | Clean merge at the reviewed SHA; security risk to CEO; must-fix; failed, missing or pending tests; superseded; failed or incomplete guard; missing guard outputs treated as protected; wrong base; closed, draft, conflicting, fork or other-repo PR; pause, off and unset do nothing; bad inputs throw |
| **Precedence (rev 2)** | changes + protected; changes + sensitive; changes on clean; approve + protected, sensitive or both; must_fix + needs-ceo; must_fix + security risk; must_fix + protected; failed tests + protected; invalid verdict + protected; exhaustive 180-case "no protected or sensitive input merges"; exhaustive "only clean approve merges"; router labels `changes-requested`, removes `ceo-approval`, tells the CEO |
| CEO commands | Green labelled PR merges at head; no label; unrelated repo; fork; HQ-repo PR; wrong base; closed, merged, draft or conflicting; failed tests; missing or pending security check; other failed check; issue approvals; reject, change, pause, resume; malformed commands; invalid inputs. **Rev 2:** `/approve` refused while paused, off, unset or empty (no PR lookup, reason stated, `/resume` suggested); refused with outstanding `changes-requested`; `/pause` and `/resume` in every mode; `/reject` while paused |
| Guard | Clean; protected path; renames; company scripts, workflows, agents, `.github`, `.claude`; config-weakening PR judged by base rules; `package.json` keys; invalid `package.json`; file count; network, secret and Electron patterns; newline file name cannot inject outputs; bad, missing or option-like refs and missing or invalid base config exit 2; release mode |
| HQ | Disallowed operations; repo overrides; mismatched, code-repo or malformed HQ; public HQ refused before any write; no fallback token; private HQ write |
| Workflows | Empty default permissions; no broad tools; `id-token` only on Claude jobs; per-job permissions; mode gating; agents never see the code-repo token; trusted review; tests without secrets; LinkedIn respects company mode. **Rev 2:** `company-tests` for `develop` and `main`; every ruleset-required check is produced by a workflow for PRs into that branch; CEO-approval checks equal the `develop` ruleset; release never pushes to `develop` or `main` and opens a sync PR; release waits for tests before merging; CEO commands get `COMPANY_MODE` |
| Release | Malformed decision; PR must be `release/vX.Y.Z` into `main`; **rev 2:** merge only after `company-tests` success on the exact commit (failure, pending, missing, superseded and invalid input all refuse) |
| **Two-job review (rev 3)** | Exactly two jobs; required check `company-security-verdict` is the first job's name, the route job is `company-pr-route`; route has `needs: verdict`, the verdict job has no `needs`; route runs only with `always()` + verdict not skipped + mode on + same repo; verdict job has no `gh pr merge`, no merge token, and runs `route-pr.mjs` only with `--validate`; same artifact name uploaded and downloaded; route uses base-commit scripts and the verdict job's runner-set outputs, with no AI; the develop ruleset requires the verdict check but not the route check. Router: clean PR merges after the security check succeeded while its own route check is still running; verdict job failed, cancelled, skipped or unknown → no merge; validation failed → no merge; artifact missing → no merge; security check absent or failed → no merge |
| **setup.sh (rev 2, static only)** | Parses; `set -Eeuo pipefail` + ERR trap; no `|| true`; clone and push not masked; privacy check precedes clone, copy and push; HQ ≠ code repo; commit then push required; success printed last; `COMPANY_MODE` set to pause, never on |

**Mutation check (rev 3):** each safeguard was deliberately reverted in turn and the suite re-run. Removing `needs: verdict` → 1 failure. Naming the route job `company-security-verdict` → 1. Merging inside the verdict job → 1. Ignoring the verdict job result → 2. Router waiting on its own check → 7. Security check not required → 1. Restored → 0.

**Mutation check (rev 2):** each fix was deliberately reverted in turn and the suite re-run. Tests only on `develop` → 2 failures. `/approve` without the pause check → 4. Old early-return precedence → 4. A direct push to `develop` in the release workflow → 1. Restored → 0.

Earlier, the original scripts were also run against three attacks to confirm F1, F3 and F6: config-weakening PR → `clean`; `PRIVACY.md` renamed away → `clean`; `/approve` on an unlabelled, unchecked PR → merged.

**Not tested** (needs GitHub): the workflows actually running; `claude-code-action` on `pull_request_target`; real `gh` JSON at runtime; rulesets; HQ creation. `setup.sh` was **not executed** in any form.

## 5. Unresolved risks
- **R1 — Agents can still run code.** `npm test` (dev cycle, release) runs agent-written tests, and `git push origin agent/…` is matched by prefix, so `git push origin agent/x:develop` passes the tool filter. The real backstop is GitHub **branch rulesets** on `develop` and `main` (required checks, no direct pushes, no bypass). Activation step 9 (rulesets) is mandatory for that reason.
- **R2 — Actions not pinned. RESOLVED 13 Nov 2026.** All 23 third-party action references are pinned to verified full commit SHAs. The pinning test passes.
- **R3 — `claude-code-action` on `pull_request_target`** is expected to work in prompt (automation) mode but has not been run. If it fails, the review check goes red and nothing merges (fail closed).
- **R4 — Public issues and PR comments by agents** can still contain confidential text; only HQ writes are technically guarded. The charter and guard patterns reduce but don't eliminate this.
- **R5 — Sensitive-pattern scan** is a tripwire, not a proof: obfuscated network code can evade it. The AI security review and CEO approval remain the second layer.
- **R10 — Artifact actions.** `actions/upload-artifact` and `actions/download-artifact` are pinned to full commit SHAs by `pin-actions.sh`. If the artifact can't be found, the router blocks (fail closed).
- **R11 — Route-job failure.** If the route job itself errors, its `company-pr-route` check is red. `/approve` requires all checks green, so you'd need to re-run that job or push again. That's safe, but manual.
- **R9 — Slow repo checks.** `build-mac` runs on every PR. If it takes longer than 20 minutes, the review routes the PR as blocked and the next push re-runs it. Raise `TESTS_WAIT_SECONDS` in the review workflow if that happens often.
- **R7 — One manual approval per release.** The sync PR waits for your `/approve` by design. Until you approve it, `develop` lacks the new version number. If `develop` changes the changelog meanwhile, the sync PR can conflict and will show as blocked; resolve it on the sync branch.
- **R8 — Sync branch name.** `sync/*` and `release/*` branches aren't covered by rulesets. That's harmless, because everything still reaches `develop`/`main` only through reviewed PRs, but you may add a ruleset restricting who can create them.
- **R6 — Subscription token.** Agents share your Claude limits; a rate-limited review produces no verdict, so the PR is blocked (safe, but it stalls).

## 6. Activation checklist
Do these in order. Stop at any step that doesn't behave as described. Rulesets come **last**, so nothing during setup needs a direct push to a protected branch.

1. **Review** this file and the patch (base: Mochi `main` at `efd668dd1ca8a88ac9272b63e2545033180d565b`).
2. **Apply on a clean branch, not `voice-impl`:** from `main` create `chore/company-os`; `git apply company-os-full.patch` (adds `AGENTS.md`, `company/`, `growth/linkedin/`; touches no existing file). Your voice work stays where it is.
3. **Run the tests:** `node --test company/test/*.test.mjs`. Pre-pinning baseline: 209 pass, 1 todo. After pinning: 210 pass, 0 todo.
4. **Pin actions:** `bash company/scripts/pin-actions.sh`, review the diff, run the tests again (the todo should disappear). Commit.
5. **Create tokens (fine-grained, expiring):**
   - `COMPANY_GH_TOKEN`: code repo + HQ repo; Contents, Pull requests, Issues: read/write; Variables: read/write. Used only by non-AI steps.
   - `HQ_GH_TOKEN`: **HQ repo only**; Issues: read/write; Metadata: read. The only token agents see.
   - `CLAUDE_CODE_OAUTH_TOKEN`: from `claude setup-token`.
6. **Install the Claude GitHub app** on the code repo.
7. **Run `bash company/scripts/setup.sh`** from the repo root on `chore/company-os`. It stops with "SETUP FAILED" on any error and only prints "Setup completed successfully" at the end. It creates labels, `develop` (from `main`) and the private HQ repo (verified private), and leaves `COMPANY_MODE=pause`. Add the secrets it lists, including `COMPANY_GH_TOKEN` in the HQ repo.
8. **Merge `chore/company-os` into `main`** (open a PR and merge it yourself), then **update `develop` from `main`** (fast-forward push). This is the last time anyone pushes to these branches directly.
9. **Add branch rulesets now (Settings → Rules → Rulesets), no bypass list:**
   - `develop`: require a pull request; require status checks `company-tests` and `company-security-verdict`; block force pushes and deletion.
   - `main`: require a pull request; require status check `company-tests`; block force pushes and deletion.
10. **Paused dry run:** run *Company · Daily standup* manually. Expect a "Company paused" brief in the HQ repo and nothing else.
11. **Safety drill (still paused):** open a test PR into `develop` that edits `PRIVACY.md`, then comment `/approve`. Expect "Not merged: the company is \"pause\"…". Close it.
12. **Go live:** comment `/resume`. Watch the first dev cycle and PR review end to end. In the Actions run, confirm `company-security-verdict` finishes before `company-pr-route` starts. Confirm a clean PR merges and a `PRIVACY.md` test PR is routed to you with `ceo-approval`.
13. **First release (Thursday):** confirm the release PR into `main` merges after `company-tests`, and that a `sync/vX.Y.Z` PR appears for your `/approve`.
14. **LinkedIn:** leave `AUTOPILOT_MODE=dry-run` until a week of drafts looks right.

## 7. Patch and bundle
- `company-os-full.patch`: created against Mochi `main` at **`efd668dd1ca8a88ac9272b63e2545033180d565b`** (10 Nov 2026, "Note that practice replies for the small model are drafted."). It contains the final revision (3) and only adds new files (`AGENTS.md`, `company/**`, `growth/linkedin/**`). None of these exist on that commit, and no existing file is modified, so it also applies to later `main` commits that don't add those paths. Apply with `git apply`.
- `company-os-rev3.patch`: the revision-3 changes only (two-job PR review). Its base is the revision-2 bundle, i.e. the files produced by the previous `company-os-full.patch`. Apply it on top of a revision-2 tree for review; to install, use the full patch.
- `lss-company-os-hardened.zip`: the same files as the full patch.
- Not included, and needed separately: nothing. `.github/workflows/` and `.claude/agents/` copies are created by `setup.sh` from `company/workflows/` and `company/agents/`.
