// Shared helpers for the company scripts. No shell is ever used: every external
// command runs through execFileSync with an argument array.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

export const REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;
export const SHA_RE = /^[0-9a-f]{40}$/;

/** Path to the gh binary. Tests point GH_BIN at a fake; production uses "gh". */
export const ghBin = () => process.env.GH_BIN || "gh";

/** Run gh with an argument array. Throws on non-zero exit. */
export function gh(args, { token, input } = {}) {
  const env = { ...process.env };
  if (token) env.GH_TOKEN = token;
  return execFileSync(ghBin(), args, {
    encoding: "utf8",
    env,
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  }).trim();
}

export function ghJson(args, opts) {
  const out = gh(args, opts);
  return JSON.parse(out);
}

export function isPositiveInt(v) {
  return typeof v === "string" && /^[1-9][0-9]{0,9}$/.test(v);
}

export function readJsonFile(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

/** Strip control characters and cap length, for text that ends up in comments or outputs. */
export function clean(text, max = 1000) {
  return String(text ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").slice(0, max);
}

/**
 * Write GitHub Actions step outputs safely. Every value uses a random heredoc
 * delimiter, so a value containing newlines or "key=value" text cannot inject
 * another output.
 */
export function writeOutputs(values, file = process.env.GITHUB_OUTPUT) {
  if (!file) return;
  let buf = "";
  for (const [key, raw] of Object.entries(values)) {
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) throw new Error(`bad output key ${key}`);
    const value = String(raw);
    let delim;
    do { delim = `EOF_${crypto.randomBytes(12).toString("hex")}`; } while (value.includes(delim));
    buf += `${key}<<${delim}\n${value}\n${delim}\n`;
  }
  fs.appendFileSync(file, buf);
}

// ---------------------------------------------------------------- verdicts

const DECISIONS = new Set(["approve", "changes", "needs-ceo"]);

/**
 * Validate the reviewer's structured verdict. Returns { ok, errors, verdict }.
 * Required: decision, summary, must_fix (array of strings), security
 * ("ok" or a non-empty description of the risk).
 */
export function validateVerdict(raw) {
  const errors = [];
  let v = raw;
  if (typeof raw === "string") {
    try { v = JSON.parse(raw); } catch { return { ok: false, errors: ["verdict is not valid JSON"], verdict: null }; }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, errors: ["verdict must be a JSON object"], verdict: null };
  if (!DECISIONS.has(v.decision)) errors.push(`decision must be one of ${[...DECISIONS].join(", ")}`);
  if (typeof v.summary !== "string" || !v.summary.trim()) errors.push("summary must be a non-empty string");
  else if (v.summary.length > 4000) errors.push("summary is longer than 4000 characters");
  if (!Array.isArray(v.must_fix) || !v.must_fix.every((x) => typeof x === "string")) errors.push("must_fix must be an array of strings");
  if (typeof v.security !== "string" || !v.security.trim()) errors.push("security must be \"ok\" or a description of the risk");
  return { ok: errors.length === 0, errors, verdict: errors.length ? null : v };
}

export function loadVerdict(path) {
  let text;
  try { text = fs.readFileSync(path, "utf8"); } catch { return { ok: false, errors: [`no verdict file at ${path}`], verdict: null }; }
  return validateVerdict(text);
}

// ---------------------------------------------------------------- pull requests

/** Fields every PR check needs, for `gh pr view --json`. */
export const PR_FIELDS = "number,url,state,isDraft,baseRefName,headRefName,headRefOid,isCrossRepository,mergeable,labels,statusCheckRollup";

/**
 * Structural checks on a PR: right repository, same-repo branch, target branch,
 * open, not a draft, mergeable. Returns a list of problems (empty = fine).
 */
export function prProblems(pr, { codeRepo, base = "develop", headSha } = {}) {
  const p = [];
  if (!pr || typeof pr !== "object") return ["PR details could not be read"];
  if (!codeRepo || !REPO_RE.test(codeRepo)) p.push("expected code repository is not configured");
  else if (!String(pr.url || "").toLowerCase().startsWith(`https://github.com/${codeRepo.toLowerCase()}/pull/`)) p.push(`PR does not belong to ${codeRepo}`);
  if (pr.isCrossRepository !== false) p.push("PR comes from a fork or another repository");
  if (pr.baseRefName !== base) p.push(`PR targets ${pr.baseRefName || "unknown"}, not ${base}`);
  if (pr.state !== "OPEN") p.push(`PR is ${String(pr.state || "unknown").toLowerCase()}`);
  if (pr.isDraft) p.push("PR is a draft");
  if (pr.mergeable !== "MERGEABLE") p.push(`PR is not mergeable (${pr.mergeable || "unknown"})`);
  if (headSha !== undefined && pr.headRefOid !== headSha) p.push("PR has new commits since it was reviewed");
  return p;
}

export function hasLabel(pr, name) {
  return Array.isArray(pr?.labels) && pr.labels.some((l) => (typeof l === "string" ? l : l?.name) === name);
}

const GOOD = new Set(["SUCCESS", "SKIPPED", "NEUTRAL"]);

/**
 * Check results from `statusCheckRollup`. Every required check must be present
 * and SUCCESS; any check anywhere that failed, errored, was cancelled or is
 * still running blocks.
 */
export function checkProblems(rollup, required = []) {
  const p = [];
  const items = Array.isArray(rollup) ? rollup : [];
  const result = (c) => {
    if (c.__typename === "StatusContext" || (c.context && !c.name)) return String(c.state || "").toUpperCase();
    if (String(c.status || "").toUpperCase() !== "COMPLETED") return "PENDING";
    return String(c.conclusion || "").toUpperCase();
  };
  const name = (c) => c.name || c.context || "unnamed check";
  for (const req of required) {
    const found = items.filter((c) => name(c) === req);
    if (!found.length) p.push(`required check "${req}" has not run`);
    else if (!found.every((c) => result(c) === "SUCCESS")) p.push(`required check "${req}" is ${found.map(result).join("/").toLowerCase()}`);
  }
  for (const c of items) {
    if (required.includes(name(c))) continue;
    const r = result(c);
    if (!GOOD.has(r)) p.push(`check "${name(c)}" is ${r.toLowerCase() || "unknown"}`);
  }
  return p;
}

export function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
