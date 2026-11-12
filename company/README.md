# Little Smoke Studio — AI company OS

An AI staff of 18 agents runs the studio on GitHub, using your Claude subscription. You are the CEO: you read one daily brief and answer approvals with one comment.

**Two repos, both free:** the public code repo (code, specs, PRs; Actions minutes are free for public repos) and a private HQ repo, `little-smoke-hq` (daily briefs, approvals, weekly reports, anything about money, legal or strategy). Watch the HQ repo in the GitHub mobile app and you get your brief as a notification each morning.

## What runs, and when (IST)
See `ORG.md` for the org chart and routines. In short: a 06:47 standup writes your brief; five dev cycles a day each ship one PR to `develop`; every PR gets an automated QA + security review and auto-merges when clean; Monday has an exec meeting; Thursday ships a release.

## Your controls
| You want to… | Do this |
|---|---|
| Approve / reject a proposal | Comment `/approve`, `/reject <why>` or `/change <what>` on the `ceo-approval` issue or PR. `/approve` on a PR merges only if the company is on, all checks are green and no must-fix items remain. |
| Pause everything except the brief | Comment `/pause` on any issue (or set variable `COMPANY_MODE=pause`) |
| Resume | Comment `/resume` |
| Stop completely | `gh variable set COMPANY_MODE --body off` |
| Give the company new work | Open an issue yourself; the Chief of Staff triages it next morning. Add `status:ready` to skip the queue. |
| Change rules | Edit `company/CHARTER.md` or `company/config.json` (agents cannot change these) |

## One-time setup
Follow the activation checklist in `company/HARDENING.md` (section 6). In short: review, run `node --test company/test/*.test.mjs`, pin actions, create three secrets (`CLAUDE_CODE_OAUTH_TOKEN`, `COMPANY_GH_TOKEN` for non-AI steps, `HQ_GH_TOKEN` for the HQ repo only), run `setup.sh`, merge the company OS into `main` and bring `develop` up to date, add branch rulesets on `develop` and `main` last, do a paused dry run, then `/resume`.

## Optional
- **Codex as a second engineer and reviewer.** Connect the repo at chatgpt.com/codex and turn on automatic reviews: every agent PR gets a Codex review too. To hand an issue to Codex, comment `@codex implement this and open a PR against develop` yourself (Codex acts on your account).
- **Roadmap board.** Create a GitHub Project (free, up to 50,000 items) on the HQ repo with Board and Roadmap views; the agents' issues show up there automatically if you add the repos to it.

## Honest limits
- Agents share your Claude subscription's limits with your own use. Five dev cycles a day is a starting point; the COO reports headroom weekly.
- The Microsoft Store upload stays manual (Partner Center); each release adds it to your brief.
- The repo is public: agents treat outside issues as untrusted data, and review only runs on PRs from this repository, never forks.
- Security details, test results and remaining risks: `company/HARDENING.md`.
