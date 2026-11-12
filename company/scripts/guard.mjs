#!/usr/bin/env node
// Guard: decides whether a change needs the CEO, before any AI verdict counts.
//
//   node guard.mjs <base-ref>            PR mode: protected paths, size, package.json keys,
//                                        sensitive patterns (network, permissions, telemetry,
//                                        Electron security, secrets, confidential material)
//   node guard.mjs --release <base-ref>  Release mode: only a version bump and changelog allowed
//
// Rules are read from <base-ref>:company/config.json (the trusted branch), never from the
// change under review. Git runs without a shell. Exit codes: 0 = checks completed (see outputs),
// 1 = release check failed, 2 = guard could not complete (callers must treat as blocked).
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { writeOutputs, clean } from "./lib.mjs";

const REF_RE = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,199}$/;

export class GuardError extends Error {}

const git = (args, cwd) => {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    throw new GuardError(`git ${args[0]} failed: ${clean(e.stderr || e.message, 300)}`);
  }
};

export function validateRef(ref, cwd) {
  if (typeof ref !== "string" || !REF_RE.test(ref) || ref.includes("..") || ref.includes("@{") || ref.endsWith(".lock") || ref.endsWith("/")) {
    throw new GuardError(`invalid git reference: ${clean(ref, 80)}`);
  }
  const sha = git(["rev-parse", "--verify", "--quiet", "--end-of-options", `${ref}^{commit}`], cwd).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new GuardError(`git reference not found: ${ref}`);
  return sha;
}

function showJson(rev, path, cwd, { optional = false } = {}) {
  let text;
  try {
    text = execFileSync("git", ["show", `${rev}:${path}`], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    if (optional) return { missing: true };
    throw new GuardError(`${path} is missing at ${rev.slice(0, 12)}`);
  }
  try { return { value: JSON.parse(text) }; } catch { return { invalid: true }; }
}

function loadRules(baseSha, cwd) {
  const r = showJson(baseSha, "company/config.json", cwd);
  if (r.invalid) throw new GuardError("company/config.json on the base branch is not valid JSON");
  const g = r.value.guard;
  if (!g || !Array.isArray(g.protectedPaths) || !Array.isArray(g.protectedPackageJsonKeys) ||
      !Number.isInteger(g.maxFiles) || !Number.isInteger(g.maxChangedLines)) {
    throw new GuardError("company/config.json on the base branch has no valid guard section");
  }
  const patterns = (g.sensitivePatterns || []).map((p) => {
    try { return { name: String(p.name), paths: Array.isArray(p.paths) ? p.paths : [""], re: new RegExp(p.regex, p.flags || "") }; }
    catch { throw new GuardError(`sensitive pattern "${p.name}" is not a valid regex`); }
  });
  return { ...g, patterns, release: r.value.release || {} };
}

/** Changed files, with renames split into delete + add so a move cannot hide a protected path. */
function changes(mergeBase, cwd) {
  const files = git(["diff", "--name-only", "-z", "--no-renames", mergeBase, "HEAD"], cwd).split("\0").filter(Boolean);
  const numstat = git(["diff", "--numstat", "-z", "--no-renames", mergeBase, "HEAD"], cwd).split("\0").filter(Boolean);
  const stats = numstat.map((rec) => {
    const [a, d, ...rest] = rec.split("\t");
    return { path: rest.join("\t"), added: a, deleted: d, binary: a === "-" || d === "-" };
  });
  return { files, stats };
}

function addedLinesByFile(mergeBase, cwd) {
  const diff = git(["diff", "-U0", "--no-renames", "--no-color", "--no-ext-diff", mergeBase, "HEAD"], cwd);
  const out = new Map();
  let current = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      const p = line.slice(4);
      current = p === "/dev/null" ? null : p.replace(/^b\//, "");
      if (current && !out.has(current)) out.set(current, []);
    } else if (current && line.startsWith("+") && !line.startsWith("+++")) {
      out.get(current).push(line.slice(1));
    }
  }
  return out;
}

const isProtected = (file, prefixes) => prefixes.some((p) => file === p || (p.endsWith("/") && file.startsWith(p)));

export function runGuard({ base, cwd = process.cwd() }) {
  const baseSha = validateRef(base, cwd);
  validateRef("HEAD", cwd);
  const mergeBase = git(["merge-base", baseSha, "HEAD"], cwd).trim();
  const rules = loadRules(baseSha, cwd);
  const { files, stats } = changes(mergeBase, cwd);

  const protectedReasons = [];
  const sensitiveReasons = [];
  for (const f of files) if (isProtected(f, rules.protectedPaths)) protectedReasons.push(`protected path: ${f}`);

  if (files.includes("package.json")) {
    const before = showJson(mergeBase, "package.json", cwd, { optional: true });
    const after = showJson("HEAD", "package.json", cwd, { optional: true });
    if (before.invalid) throw new GuardError("package.json on the base branch is not valid JSON");
    if (after.invalid) protectedReasons.push("package.json is not valid JSON");
    else if (after.missing) protectedReasons.push("package.json deleted");
    else {
      const b = before.value || {};
      for (const k of rules.protectedPackageJsonKeys) {
        if (JSON.stringify(b[k]) !== JSON.stringify(after.value[k])) protectedReasons.push(`package.json "${k}" changed`);
      }
    }
  }

  const weight = Number.isInteger(rules.binaryLineWeight) ? rules.binaryLineWeight : 50;
  const lines = stats.reduce((n, s) => n + (s.binary ? weight : (parseInt(s.added, 10) || 0) + (parseInt(s.deleted, 10) || 0)), 0);
  if (files.length > rules.maxFiles) protectedReasons.push(`${files.length} files changed (limit ${rules.maxFiles})`);
  if (lines > rules.maxChangedLines) protectedReasons.push(`${lines} lines changed (limit ${rules.maxChangedLines})`);

  const added = addedLinesByFile(mergeBase, cwd);
  for (const pat of rules.patterns) {
    for (const [file, adds] of added) {
      if (!pat.paths.some((p) => p === "" || file.startsWith(p))) continue;
      if (adds.some((l) => pat.re.test(l))) { sensitiveReasons.push(`${pat.name} in ${file}`); }
    }
  }

  return {
    files: files.length,
    lines,
    protected: protectedReasons.length > 0,
    sensitive: sensitiveReasons.length > 0,
    reasons: [...protectedReasons, ...sensitiveReasons].map((r) => clean(r, 300)),
  };
}

/** Release mode: the release branch may only bump the version and add a changelog entry. */
export function runReleaseGuard({ base, cwd = process.cwd() }) {
  const baseSha = validateRef(base, cwd);
  const mergeBase = git(["merge-base", baseSha, "HEAD"], cwd).trim();
  const rules = loadRules(baseSha, cwd);
  const allowed = rules.release.allowedFiles || ["package.json", "package-lock.json", "docs/changelog.html"];
  const { files } = changes(mergeBase, cwd);
  const problems = [];
  for (const f of files) if (!allowed.includes(f)) problems.push(`release changes a file it must not: ${f}`);
  const strip = (pkg, lock) => {
    const c = JSON.parse(JSON.stringify(pkg));
    delete c.version;
    if (lock && c.packages && c.packages[""]) delete c.packages[""].version;
    return JSON.stringify(c);
  };
  for (const [f, lock] of [["package.json", false], ["package-lock.json", true]]) {
    if (!files.includes(f)) continue;
    const before = showJson(mergeBase, f, cwd);
    const after = showJson("HEAD", f, cwd, { optional: true });
    if (before.invalid || after.invalid || after.missing) { problems.push(`${f} is missing or not valid JSON`); continue; }
    if (strip(before.value, lock) !== strip(after.value, lock)) problems.push(`${f} changes more than the version`);
  }
  if (!files.includes("package.json")) problems.push("release does not bump package.json");
  return { ok: problems.length === 0, problems: problems.map((p) => clean(p, 300)) };
}

function main(argv) {
  const release = argv[0] === "--release";
  const base = release ? argv[1] : argv[0];
  try {
    if (release) {
      const r = runReleaseGuard({ base });
      writeOutputs({ release_ok: r.ok, reasons: r.problems.join("; ") || "clean" });
      console.log(r.ok ? "release guard: clean" : `release guard: ${r.problems.join("; ")}`);
      return r.ok ? 0 : 1;
    }
    const r = runGuard({ base });
    const reasons = r.reasons.join("; ") || "clean";
    writeOutputs({ protected: r.protected, sensitive: r.sensitive, reasons, completed: true });
    console.log(`files=${r.files} lines=${r.lines} protected=${r.protected} sensitive=${r.sensitive} -> ${reasons}`);
    return 0;
  } catch (e) {
    const msg = e instanceof GuardError ? e.message : `unexpected error: ${clean(e.message, 300)}`;
    try { writeOutputs({ protected: true, sensitive: true, reasons: `guard could not complete: ${msg}`, completed: false }); } catch {}
    console.error(`guard could not complete: ${msg}`);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) process.exitCode = main(process.argv.slice(2));
