# Playbook: weekly exec meeting (Chief of Staff chairs; CPO, CTO, CMO, COO attend)

1. Gather last week's facts with `gh`: merged PRs, releases, open bugs by priority, issues opened by users, failed runs, and `growth/linkedin` ledger posts if available on the `growth-ledger` branch.
2. Ask each executive (Task tool) for a 5-line report from their role: what moved, what's stuck, one risk, one proposal.
3. CPO updates `company/ROADMAP.md` (Now/Next/Later) — changes to Now/Next that add scope become `ceo-approval` issues instead of edits.
4. Turn agreed work into issues for next week (labels: type, priority, size, role; `status:ready` only for approved roadmap items).
5. COO adds usage and ops notes (subscription headroom, upcoming deadlines, Store uploads pending).
6. In the HQ repo (via `node company/scripts/hq.mjs`), open `Weekly report — week of <date>` (label `weekly-report`) with: wins, metrics, decisions needed (links), next week's top 5. Commit public document changes (roadmap, specs; nothing confidential) on a branch and open a PR to `develop`.
