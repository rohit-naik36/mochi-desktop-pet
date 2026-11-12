#!/usr/bin/env node
// Runs a limited set of gh issue commands against the PRIVATE HQ repo (briefs, approvals, reports).
//   node company/scripts/hq.mjs issue create --title "..." --body-file .company/brief.md --label daily-brief
//
// Safety:
// - The HQ repo must match config hq.repo, must not be the public code repo, and must be private
//   (checked with GitHub before every call). Confidential text can never be sent to a public repo.
// - Only issue list/view/create/comment/edit/close/reopen and label list are allowed.
// - --repo / -R overrides are rejected. Arguments go to gh without a shell.
// - Uses HQ_GH_TOKEN only (a token scoped to the HQ repo), never the code-repo token.
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import { gh, ghJson, REPO_RE, clean } from "./lib.mjs";

const ALLOWED = {
  issue: new Set(["list", "view", "create", "comment", "edit", "close", "reopen"]),
  label: new Set(["list"]),
};

export class HqError extends Error {}

export function validateArgs(args) {
  if (!Array.isArray(args) || args.length < 2) throw new HqError("usage: hq.mjs <issue|label> <subcommand> [flags]");
  const [group, sub] = args;
  if (!ALLOWED[group] || !ALLOWED[group].has(sub)) throw new HqError(`not allowed: ${clean(group, 20)} ${clean(sub, 20)}`);
  for (const a of args) {
    if (typeof a !== "string") throw new HqError("arguments must be strings");
    if (a === "--repo" || a === "-R" || a.startsWith("--repo=") || /^-R./.test(a)) throw new HqError("--repo cannot be overridden");
  }
  return args;
}

export function resolveHqRepo(env, cfg) {
  const configured = cfg?.hq?.repo;
  const repo = env.HQ_REPO || configured;
  const codeRepo = env.CODE_REPO || cfg?.codeRepo;
  if (!REPO_RE.test(repo || "")) throw new HqError("HQ repo is not a valid owner/repo");
  if (configured && repo.toLowerCase() !== configured.toLowerCase()) throw new HqError(`HQ_REPO (${repo}) does not match config hq.repo (${configured})`);
  if (codeRepo && repo.toLowerCase() === codeRepo.toLowerCase()) throw new HqError("HQ repo must not be the public code repo");
  return repo;
}

export function run(args, env = process.env) {
  const cfg = JSON.parse(fs.readFileSync(new URL("../config.json", import.meta.url), "utf8"));
  validateArgs(args);
  const repo = resolveHqRepo(env, cfg);
  const token = env.HQ_GH_TOKEN;
  if (!token) throw new HqError("HQ_GH_TOKEN is not set");
  const info = ghJson(["repo", "view", repo, "--json", "visibility,isPrivate"], { token });
  if (info.isPrivate !== true || String(info.visibility).toUpperCase() !== "PRIVATE") {
    throw new HqError(`${repo} is not private; refusing to write HQ material there`);
  }
  return gh([...args, "--repo", repo], { token });
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try { process.stdout.write(run(process.argv.slice(2)) + "\n"); }
  catch (e) { console.error(`hq.mjs refused: ${clean(e.message, 400)}`); process.exitCode = 1; }
}
