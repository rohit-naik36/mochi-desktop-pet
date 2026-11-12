# Playbook: dev cycle (Engineering Manager)

Exactly one unit of work per run.

1. Check `gh pr list --label changes-requested --base develop`. If any, take the oldest: read the review, check out its branch, delegate the fixes to the original engineer agent, run `npm test`, push, remove `changes-requested`. Count rounds in a PR comment ("Fix round N"). If this would be round 3, do not code: label the PR `ceo-approval`, comment a short summary of what keeps failing and the options, and stop. Then stop.
2. Otherwise pick the top issue: `gh issue list --label status:ready --state open` sorted by `priority:p0` → `p3`, then oldest. Skip issues that still carry `ceo-approval`.
3. Label it `status:in-progress`. Create branch `agent/<number>-<short-slug>` from `origin/develop`.
4. Delegate implementation to the engineer named by its `role:` label (Task tool, subagent with that name). Give them: the issue text, linked spec, relevant files, acceptance criteria, and the charter rules.
5. Verify: `npm test` passes; the diff is focused; no protected paths changed (see `company/config.json`).
6. Commit with a conventional message (no AI attribution lines), push, and open a PR with `gh pr create --base develop --title "<type>(<scope>): <summary>" --body "Closes #<n>

## What
...
## How it was tested
..."`.
7. Label the issue `status:review`. Stop.

Push only `agent/<number>-<slug>` branches (`git push -u origin agent/<number>-<slug>`). Never push `develop`, `main` or `release/*`.

If the issue is unclear or too big, comment what's missing, label it `status:blocked`, and stop without coding.
