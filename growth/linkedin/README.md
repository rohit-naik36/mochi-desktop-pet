# LinkedIn autopilot

Posts Mochi progress to Rohit's LinkedIn on its own, only when something is worth posting.

## How it decides
1. **Collect:** releases (tags, GitHub release notes, docs/changelog.html) and `feat`/`fix`/`perf` commits grouped by scope since the last scan. Only material that has shipped in a `v*` tag is used, unless its scope is listed in `buildInPublicScopes`. Teams stays out until `teamsIsPublic` is true.
2. **Select:** an editor model scores every candidate on user impact, novelty, proof, story and pillar fit (0–50). Below `minSelectScore` means no post that day.
3. **Write:** the post is drafted from `voice.md` using only the source material.
4. **Critique:** a second pass fact-checks every claim and scores hook, specificity, reader value and voice. It has to score at least 8 with zero problems; there is one rewrite, then it gives up.
5. **Hard gates (code, not AI):** length, banned terms (employer, intern, pricing, unreleased model work…), hashtag and emoji limits, link allowlist, secret patterns, and no number that isn't in the source.
6. **Publish:** to your personal profile, with a press image, then the result is recorded on the `growth-ledger` branch so no topic repeats within 21 days.

Cadence: Tue and Thu 09:07 IST, plus right after a GitHub Release. At most 2 posts a week, at least 2 days apart.

## One-time setup (about 15 minutes)
1. https://www.linkedin.com/developers/apps → Create app (it needs a LinkedIn Page to attach to; create a "Little Smoke Studio" page first).
2. Products tab: add **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect**. Both are self-serve.
3. Auth tab: add the redirect URL `http://localhost:8765/callback`. Copy the Client ID and Client Secret.
4. Subscription token (no API bill): run `claude setup-token`, then `gh secret set CLAUDE_CODE_OAUTH_TOKEN` (the same secret the AI company uses).
5. Sign in: `set LINKEDIN_CLIENT_ID=…` and `set LINKEDIN_CLIENT_SECRET=…`, then `node growth/linkedin/auth.mjs`
6. `gh variable set AUTOPILOT_MODE --body dry-run`, push, then run the workflow from the Actions tab. Read the drafts in the run summary.
7. When the drafts look right: `gh variable set AUTOPILOT_MODE --body live`

## Running it
- Kill switch: `gh variable set AUTOPILOT_MODE --body off`
- The only recurring task: LinkedIn gives self-serve apps 60-day tokens with no refresh token. At day 50 the workflow opens a GitHub issue; run `node growth/linkedin/auth.mjs` again (about 2 minutes).
- Real numbers (downloads, ratings) can only appear in posts once you add them to `metrics.facts` in config.json.
- When Mochi for Teams launches: set `teamsIsPublic` to true and remove "pricing"/"price" from bannedTerms if you want pricing posts.
