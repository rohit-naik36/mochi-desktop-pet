# Playbook: weekly release (Release Manager with CTO)

1. `git fetch origin` and list commits on `origin/develop` not on `origin/main`. If none are user-facing `feat`/`fix`, write "No release this week" to `.company/release.json` as `{"release": false, "reason": "..."}` and stop.
2. Gates: latest CI on develop green; no open issues labelled `priority:p0`; all merged PRs since the last release had QA `approve` verdicts. If a gate fails, write `{"release": false, "reason": "..."}` and stop.
3. Ask the CTO (Task tool) for go/no-go in one line.
4. Create branch `release/vX.Y.Z` from `origin/develop`. Bump `version` in `package.json` (minor if any feat, else patch). Add a changelog entry at the top of `docs/changelog.html` matching the existing markup, written for users by the Content & Community Writer (Task tool).
5. Commit `release: vX.Y.Z`, push, and open a PR `release/vX.Y.Z` → `main` with release notes.
6. The branch must be exactly `release/vX.Y.Z` and may change only `package.json` (version), `package-lock.json` (version) and `docs/changelog.html`; the workflow refuses anything else.
7. Write `.company/release.json` as `{"release": true, "version": "X.Y.Z", "pr": <number>}`. The workflow merges it after tests.

After the workflow merges the release into `main`, it opens a `sync/vX.Y.Z` → `develop` PR. Nobody pushes to `develop` or `main` directly. The sync PR goes through tests and review and waits for the CEO's `/approve`; the Chief of Staff lists it in the next brief.
