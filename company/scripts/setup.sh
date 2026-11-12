#!/usr/bin/env bash
# One-time setup for the Little Smoke Studio company OS. Run from the repo root in Git Bash.
# Review company/HARDENING.md first. This script leaves COMPANY_MODE=pause.
set -Eeuo pipefail
trap 'echo "SETUP FAILED at line $LINENO. Nothing after this point ran; fix the problem and re-run." >&2' ERR
command -v gh >/dev/null || { echo "Install the GitHub CLI first: https://cli.github.com"; exit 1; }

echo "1/5 Moving workflows and agents into place"
mkdir -p .github/workflows .claude/agents
cp company/workflows/*.yml .github/workflows/
cp company/agents/*.md .claude/agents/
if [ -f growth/linkedin/linkedin-autopilot.yml ]; then cp growth/linkedin/linkedin-autopilot.yml .github/workflows/; fi
mkdir -p .company
if ! grep -qxF ".company/" .gitignore 2>/dev/null; then echo ".company/" >> .gitignore; fi

echo "2/5 Creating labels"
lab() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null; }
lab "ceo-approval" "D93F0B" "Waiting for the CEO: /approve /reject /change"
lab "approved" "0E8A16" "Approved by the CEO"
lab "rejected" "B60205" "Rejected by the CEO"
lab "ceo-changes" "FBCA04" "CEO asked for changes"
lab "daily-brief" "1D76DB" "Chief of Staff daily brief"
lab "weekly-report" "1D76DB" "Weekly exec report"
lab "changes-requested" "FBCA04" "Review asked for fixes"
lab "review-blocked" "B60205" "Review could not complete safely; not merged"
for s in ready in-progress review blocked done; do lab "status:$s" "C5DEF5" "Workflow status"; done
for p in p0 p1 p2 p3; do lab "priority:$p" "E99695" "Priority"; done
for t in feature bug chore research marketing ops design; do lab "type:$t" "BFD4F2" "Type"; done
for z in s m l; do lab "size:$z" "EDEDED" "Size (s/m fit one dev cycle)"; done
for r in $(ls company/agents | sed 's/\.md$//'); do lab "role:$r" "D4C5F9" "Owner agent"; done
lab "agent:codex" "000000" "Handed to Codex"

echo "3/5 Creating the develop branch"
git fetch origin
if ! git ls-remote --exit-code --heads origin develop >/dev/null; then
  git branch -f develop origin/main && git push origin develop
fi

echo "3b/5 Creating and initialising the private HQ repo"
HQ=$(node -p "require('./company/config.json').hq.repo")
CODE=$(gh repo view --json nameWithOwner -q .nameWithOwner)
[ "$HQ" != "$CODE" ] || { echo "HQ repo must not be the code repo ($CODE)" >&2; exit 1; }
if ! gh repo view "$HQ" >/dev/null 2>&1; then
  gh repo create "$HQ" --private --description "Little Smoke Studio HQ: briefs, approvals, reports (private)"
fi
VIS=$(gh repo view "$HQ" --json visibility -q .visibility)
if [ "$VIS" != "PRIVATE" ]; then
  echo "Refusing to write to $HQ: it is $VIS, not PRIVATE. Make it private and re-run." >&2
  exit 1
fi
TMP=$(mktemp -d)
gh repo clone "$HQ" "$TMP"
mkdir -p "$TMP/.github/workflows" "$TMP/company/scripts"
cp company/workflows/company-ceo-commands.yml "$TMP/.github/workflows/"
cp company/scripts/ceo-command.mjs company/scripts/lib.mjs "$TMP/company/scripts/"
cp company/config.json "$TMP/company/"
printf "# Little Smoke Studio HQ\n\nPrivate. Daily briefs, approvals and weekly reports from the AI staff.\nAnswer approvals with /approve, /reject <why> or /change <what>.\n" > "$TMP/README.md"
(
  cd "$TMP"
  git add -A
  if git diff --cached --quiet; then
    echo "  HQ repo already up to date"
  else
    git commit -qm "chore: HQ setup"
    git push -q origin HEAD
  fi
)
for L in "ceo-approval:D93F0B" "approved:0E8A16" "rejected:B60205" "ceo-changes:FBCA04" "daily-brief:1D76DB" "weekly-report:1D76DB"; do
  gh label create "${L%%:*}" --color "${L##*:}" --force --repo "$HQ" >/dev/null
done
gh variable set CODE_REPO --body "$CODE" --repo "$HQ"
gh variable set HQ_REPO --body "$HQ"
echo "  ! In $HQ add COMPANY_GH_TOKEN (for CEO commands): gh secret set COMPANY_GH_TOKEN --repo $HQ"

echo "4/5 Setting company mode to pause (comment /resume on the first brief to go live)"
gh variable set COMPANY_MODE --body pause
gh variable set COMPANY_MODEL --body sonnet
gh variable set COMPANY_STRATEGY_MODEL --body opus

echo "5/5 Checking secrets"
gh secret list | grep -q CLAUDE_CODE_OAUTH_TOKEN || echo "  ! Missing CLAUDE_CODE_OAUTH_TOKEN (run: claude setup-token, then gh secret set CLAUDE_CODE_OAUTH_TOKEN)"
gh secret list | grep -q COMPANY_GH_TOKEN || echo "  ! Missing COMPANY_GH_TOKEN (fine-grained token: code repo + HQ repo; used only by non-AI steps)"
gh secret list | grep -q HQ_GH_TOKEN || echo "  ! Missing HQ_GH_TOKEN (fine-grained token: HQ repo ONLY, Issues read/write; the only token agents see)"
echo ""
echo "Before /resume: add branch rulesets for develop and main (Settings > Rules > Rulesets):"
echo "  - Require a pull request; block force pushes and deletions"
echo "  - develop: require status checks company-tests and company-security-verdict"
echo "  - main:    require status check company-tests"
echo "  - No bypass list"
echo "And run: bash company/scripts/pin-actions.sh   (pins actions to commit SHAs; review the diff)"
trap - ERR
echo "Setup completed successfully. COMPANY_MODE is pause."
echo "Next: commit and push, then run 'Company · Daily standup' from the Actions tab."
