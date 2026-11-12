#!/usr/bin/env bash
# Pins every third-party action in company/workflows/*.yml (and the LinkedIn workflow) to the commit
# SHA its tag currently points at, keeping the tag as a comment. Needs gh and network access.
# Review the resulting diff (and the actions' release notes) before committing.
set -euo pipefail
files=(company/workflows/*.yml growth/linkedin/linkedin-autopilot.yml)
grep -ho 'uses: [A-Za-z0-9_.-]*/[A-Za-z0-9_.-]*@v[0-9][0-9.]*' "${files[@]}" | sort -u | while read -r _ ref; do
  repo="${ref%@*}"; tag="${ref#*@}"
  sha=$(gh api "repos/$repo/commits/$tag" --jq .sha)
  [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "Could not resolve $ref"; exit 1; }
  echo "$ref -> $sha"
  for f in "${files[@]}"; do
    sed -i.bak "s|uses: $repo@$tag\$|uses: $repo@$sha # $tag|" "$f" && rm -f "$f.bak"
  done
done
echo "Pinned. Review with: git diff -- company/workflows growth/linkedin"
