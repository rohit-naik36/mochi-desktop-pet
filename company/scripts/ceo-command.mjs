#!/usr/bin/env node
// Applies the CEO's slash commands. The workflow runs this only for comments by the repo owner;
// this script still validates everything and refuses anything it cannot verify.
//
// Env: NUMBER, IS_PR ("true"/"false"), BODY (comment text), GITHUB_REPOSITORY (where the comment
//      was made), CODE_REPO (the public code repo), COMPANY_MODE (the code repo's mode variable),
//      GH_TOKEN (fine-grained token), REQUIRED_CHECKS (optional comma list; defaults to config).
//
// /approve on a PR merges only when the company is "on". /pause and /resume work in every mode.
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import { gh, ghJson, isPositiveInt, prProblems, checkProblems, hasLabel, clean, REPO_RE, PR_FIELDS } from "./lib.mjs";

const COMMANDS = new Set(["approve", "reject", "change", "pause", "resume"]);

/** Parse the first line of a comment. Returns { cmd, note } or { error }. */
export function parseCommand(body) {
  if (typeof body !== "string") return { error: "empty comment" };
  const first = body.replace(/\r/g, "").split("\n")[0].trim();
  const m = first.match(/^\/([a-z]+)(?:\s+(.*))?$/i);
  if (!m) return { error: "not a command" };
  const cmd = m[1].toLowerCase();
  if (!COMMANDS.has(cmd)) return { error: `unknown command /${clean(m[1], 30)}` };
  const note = clean((m[2] || "").trim(), 1000);
  if ((cmd === "pause" || cmd === "resume") && note) return { error: `/${cmd} takes no text` };
  if (cmd === "approve" && note && !/^[\w\s.,:!?'"()-]*$/.test(note)) return { error: "unexpected text after /approve" };
  return { cmd, note };
}

function requiredChecks(env) {
  if (env.REQUIRED_CHECKS) return env.REQUIRED_CHECKS.split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const cfg = JSON.parse(fs.readFileSync(new URL("../config.json", import.meta.url), "utf8"));
    if (Array.isArray(cfg.requiredChecks) && cfg.requiredChecks.length) return cfg.requiredChecks;
  } catch {}
  return ["company-tests", "company-security-verdict"];
}

/** Every reason a CEO approval of this PR must be refused (empty = safe to merge). */
export function approvalProblems(pr, { codeRepo, commentRepo, required }) {
  const p = [];
  if (commentRepo !== codeRepo) p.push(`PR approvals only work in ${codeRepo}`);
  if (!hasLabel(pr, "ceo-approval")) p.push("this PR is not waiting for CEO approval (no ceo-approval label)");
  if (hasLabel(pr, "changes-requested")) p.push("must-fix items are still outstanding (changes-requested); a CEO approval cannot override them");
  p.push(...prProblems(pr, { codeRepo, base: "develop" }));
  p.push(...checkProblems(pr.statusCheckRollup, required));
  return p;
}

export function run(env = process.env) {
  const { NUMBER, IS_PR, BODY } = env;
  const commentRepo = env.GITHUB_REPOSITORY;
  const codeRepo = env.CODE_REPO || commentRepo;
  if (!isPositiveInt(NUMBER)) throw new Error("NUMBER must be a positive integer");
  if (IS_PR !== "true" && IS_PR !== "false") throw new Error("IS_PR must be true or false");
  if (!REPO_RE.test(commentRepo || "") || !REPO_RE.test(codeRepo || "")) throw new Error("repository names are invalid");

  const parsed = parseCommand(BODY);
  if (parsed.error) { console.log(`Ignored: ${parsed.error}.`); return { action: "ignored", reason: parsed.error }; }
  const { cmd, note } = parsed;
  const kind = IS_PR === "true" ? "pr" : "issue";
  const R = ["--repo", commentRepo];
  const rm = (l) => { try { gh([kind, "edit", NUMBER, ...R, "--remove-label", l]); } catch {} };
  const add = (l) => gh([kind, "edit", NUMBER, ...R, "--add-label", l]);
  const say = (t) => gh([kind, "comment", NUMBER, ...R, "--body", t]);

  switch (cmd) {
    case "approve": {
      if (kind === "pr") {
        if (commentRepo !== codeRepo) {
          say(`Not merged. PR approvals only work in ${codeRepo}.`);
          return { action: "refused", problems: [`PR approvals only work in ${codeRepo}`] };
        }
        const mode = env.COMPANY_MODE || "";
        if (mode !== "on") {
          const why = `the company is ${mode ? `"${clean(mode, 20)}"` : "in an unknown mode (COMPANY_MODE is unset)"}, and paused or stopped companies never merge`;
          say(`Not merged: ${why}. Comment \`/resume\` first, then \`/approve\` again.`);
          return { action: "refused", problems: [why] };
        }
        const pr = ghJson(["pr", "view", NUMBER, ...R, "--json", PR_FIELDS]);
        const problems = approvalProblems(pr, { codeRepo, commentRepo, required: requiredChecks(env) });
        if (problems.length) {
          say(`Not merged. Approval refused because:\n${problems.map((x) => `- ${clean(x, 300)}`).join("\n")}\n\nFix these, then comment \`/approve\` again.`);
          return { action: "refused", problems };
        }
        gh(["pr", "merge", NUMBER, ...R, "--squash", "--delete-branch", "--match-head-commit", pr.headRefOid]);
        rm("ceo-approval"); rm("changes-requested"); add("approved");
        say("Approved by the CEO and merged.");
        return { action: "merged" };
      }
      const issue = ghJson(["issue", "view", NUMBER, ...R, "--json", "labels,state"]);
      if (!hasLabel(issue, "ceo-approval") || issue.state !== "OPEN") {
        say("Nothing to approve here: this issue is not an open `ceo-approval` request.");
        return { action: "refused", problems: ["not an open ceo-approval issue"] };
      }
      rm("ceo-approval"); add("approved");
      say("Approved by the CEO. The Chief of Staff will act on it at the next standup.");
      return { action: "approved" };
    }
    case "reject":
      rm("ceo-approval"); add("rejected");
      gh([kind, "close", NUMBER, ...R, "--comment", `Rejected by the CEO${note ? ": " + note : ""}.`]);
      return { action: "rejected" };
    case "change":
      rm("ceo-approval"); add("ceo-changes");
      if (kind === "pr") add("changes-requested");
      say(`Noted. The team will revise this and bring it back.${note ? `\n\nCEO note: ${note}` : ""}`);
      return { action: "changes" };
    case "pause":
    case "resume": {
      const value = cmd === "pause" ? "pause" : "on";
      gh(["variable", "set", "COMPANY_MODE", "--body", value, "--repo", codeRepo]);
      say(cmd === "pause" ? "Company paused. Only the daily brief will run. Comment `/resume` to restart." : "Company resumed.");
      return { action: cmd };
    }
  }
  return { action: "ignored" };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try { run(); } catch (e) { console.error(`ceo-command failed closed: ${clean(e.message, 500)}`); process.exitCode = 1; }
}
