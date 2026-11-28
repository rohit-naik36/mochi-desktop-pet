# Dependency audit before the 0.13.0 freeze

Date: 2026-11-23. Issue: #67. Scope: `npm audit` against `package-lock.json` at 0.12.0 (electron 44.9.1, electron-builder 26.15.3, node-llama-cpp 3.22.2).

No code, dependency, lockfile or Electron setting was changed by this note. `package.json` and `package-lock.json` are protected paths, so the fixes below are proposals that need CEO approval.

## Result

- `npm audit`: 6 moderate, 0 low, 0 high, 0 critical (all one advisory).
- `npm audit --omit=dev`: 0 vulnerabilities. The shipped app's runtime dependency tree (`node-llama-cpp` and its dependencies) is clean.
- Every finding is reachable only through `electron-builder`, a devDependency used at packaging time.

## Findings

One advisory: minimatch, denial of service through glob pattern amplification (GHSA-g3hv-75wg-m249, CWE-405, affected range `>=7.0.0 <11.0.1`, fixed in 11.0.1). The other five rows are packages npm flags only because they depend on an affected minimatch.

| Package | Severity | How it gets in | Runtime or build-time | Fix |
|---|---|---|---|---|
| minimatch 10.2.6 (top level) | moderate | electron-builder > app-builder-lib (`^10.2.5`) | Build-time only | Override to `^11.0.1` |
| minimatch 9.0.9 (nested) | moderate | electron-builder > app-builder-lib > @electron/universal (`^9.0.3`) | Build-time only (Mac universal build) | Override to `^11.0.1` |
| @electron/universal | moderate | app-builder-lib | Build-time only | Cleared by the minimatch override |
| app-builder-lib | moderate | electron-builder | Build-time only | Cleared by the minimatch override |
| dmg-builder | moderate | electron-builder | Build-time only | Cleared by the minimatch override |
| electron-builder-squirrel-windows | moderate | app-builder-lib | Build-time only | Cleared by the minimatch override |
| electron-builder (direct devDependency) | moderate | direct | Build-time only | Cleared by the minimatch override |

Other minimatch copies in the tree (3.1.5, 5.1.9) are outside the affected range and are not flagged.

## Why a bump in range does not fix it

- `npm audit` suggests `electron-builder@24.13.3`. That is a major downgrade, is not a real fix, and is out of scope (non-goal: build tooling major changes). Rejected.
- The newest electron-builder (26.18.0) still pins `app-builder-lib` to minimatch `^10.2.5`, which is inside the affected range. Updating electron-builder alone does not clear the finding.
- minimatch 11 only publishes for Node `20 || >=22`. CI and local builds here run Node 20, so this is fine.

## Proposed fix (needs CEO approval)

Add scoped overrides to `package.json`, next to the existing `simple-git` override, then regenerate the lockfile with `npm install`:

```json
"overrides": {
  "simple-git": "^4.0.1",
  "app-builder-lib": {
    "minimatch": "^11.0.1",
    "@electron/asar": { "minimatch": "^3.1.2" }
  },
  "@electron/universal": { "minimatch": "^11.0.1" },
  "dir-compare": { "minimatch": "^3.1.2" }
}
```

Why scoped and not a blanket `"minimatch": "^11.0.1"`: minimatch 11 is no longer a callable function export. `glob@7` (via @electron/asar) and `dir-compare@4` (via @electron/universal) call it as a function or default import, so they are pinned back to 3.x, which is outside the affected range. Only the two direct users (`app-builder-lib`, `@electron/universal`) move to 11, and both import the named `minimatch` export.

Checked in a scratch copy outside the repo (not the working tree):

- `npm audit` reports 0 vulnerabilities.
- `npm ls minimatch` resolves to 11.0.9 for app-builder-lib and @electron/universal, 3.1.5 for glob and dir-compare, 5.1.9 for filelist.
- `require("app-builder-lib")` and `require("@electron/universal")` load.

Not checked: a real packaging run. Before merge, run `dist:win` and the Mac universal build (`dist:mac`) once on CI or a build machine. If packaging breaks, remove the override and take the dismissal below instead.

## Alternative: dismiss

If the CEO prefers no override, dismissal reasons that hold today:

- The affected code runs only inside electron-builder on our own build machine, against our own `files` globs in `package.json`. No user input, no network input and no shipped code reaches it.
- minimatch is not in the production dependency tree (`npm ls minimatch --omit=dev` is empty) and is not packaged into the app (`build.files` includes only `src/**/*`).
- Impact is limited to a slow build, not to users.

Recommendation: apply the override after a packaging check; dismissal is acceptable for 0.13.0 if the freeze is tight.

## Local audit versus the repository alert list

The issue notes that the repository's alert list differs from local `npm audit`. The alert list is not readable from here without credentials, so this is not confirmed. Likely causes:

- The alert list includes manifests that `npm audit` on the root lockfile does not cover, notably `server/bun.lock` and any lockfiles under `teams/` or `pulse/` if present. Audit those separately.
- The alert source uses the GitHub advisory database and may include alerts for packages that are dev-only or already dismissed; `npm audit` reports the same database but only for the tree it resolves.
- Alerts may be stale: they are raised per lockfile version and clear on the next scan after a lockfile change (for example after the `simple-git` override).
- `npm audit` counts a package once per advisory, while the alert list counts per manifest path and per vulnerable copy, so the totals differ.

Suggested follow-up: compare the alert list package names to this table; any name not here points to a different manifest.
