// Test helpers: a fake `gh` that records every call and never talks to GitHub.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const FAKE = `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify({ args, token: process.env.GH_TOKEN || null }) + "\\n");
const rules = JSON.parse(fs.readFileSync(process.env.FAKE_GH_RULES, "utf8"));
const hit = rules.find((r) => r.args.every((a, i) => a === "*" || a === args[i]));
if (!hit) { process.stdout.write(""); process.exit(0); }
if (hit.stdout !== undefined) process.stdout.write(typeof hit.stdout === "string" ? hit.stdout : JSON.stringify(hit.stdout));
process.exit(hit.exit || 0);
`;

/**
 * Install a fake gh for this process. `rules` is a list of { args: [...prefix, "*" wildcard], stdout, exit }.
 * Returns { calls(), mutations(), reset(rules) }.
 */
export function fakeGh(rules = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fakegh-"));
  const bin = path.join(dir, "gh");
  fs.writeFileSync(bin, FAKE, { mode: 0o755 });
  const log = path.join(dir, "log.jsonl");
  const rulesFile = path.join(dir, "rules.json");
  const set = (r) => { fs.writeFileSync(rulesFile, JSON.stringify(r)); fs.writeFileSync(log, ""); };
  set(rules);
  process.env.GH_BIN = bin;
  process.env.FAKE_GH_LOG = log;
  process.env.FAKE_GH_RULES = rulesFile;
  const calls = () => fs.readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  return {
    calls,
    /** Calls that would change GitHub state. */
    mutations: () => calls().filter(({ args }) =>
      ["merge", "edit", "comment", "close", "create", "reopen", "set"].includes(args[1]) || args[0] === "api"),
    merged: () => calls().some(({ args }) => args[0] === "pr" && args[1] === "merge"),
    reset: set,
  };
}

/** Parse a GITHUB_OUTPUT file written with heredoc delimiters. */
export function parseOutputs(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const out = {};
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z_][A-Za-z0-9_-]*)<<(.+)$/);
    if (m) {
      const [_, key, delim] = m;
      const val = [];
      i++;
      while (i < lines.length && lines[i] !== delim) val.push(lines[i++]);
      out[key] = val.join("\n");
    } else if (lines[i].includes("=")) {
      const k = lines[i].slice(0, lines[i].indexOf("="));
      out[k] = lines[i].slice(lines[i].indexOf("=") + 1);
    }
  }
  return out;
}

export const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** Create a throwaway git repo whose `develop` holds the company config and a tiny app. */
export function fixtureRepo(configPath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guard-"));
  git(dir, "init", "-q", "-b", "develop");
  git(dir, "config", "user.name", "test");
  git(dir, "config", "user.email", "t@example.com");
  git(dir, "config", "commit.gpgsign", "false");
  const w = (p, s) => { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), s); };
  fs.mkdirSync(path.join(dir, "company"), { recursive: true });
  fs.copyFileSync(configPath, path.join(dir, "company/config.json"));
  w("package.json", JSON.stringify({ name: "mochi", version: "0.12.0", dependencies: { a: "1.0.0" }, scripts: { test: "node --test" } }, null, 2) + "\n");
  w("package-lock.json", JSON.stringify({ name: "mochi", version: "0.12.0", lockfileVersion: 3, packages: { "": { name: "mochi", version: "0.12.0" } } }, null, 2) + "\n");
  w("PRIVACY.md", "# Privacy\nNothing leaves your device.\n");
  w("src/app.js", "export const hello = () => 'hi';\n");
  w("docs/changelog.html", "<h2>0.12.0</h2>\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "base");
  git(dir, "checkout", "-q", "-b", "agent/1-change");
  return {
    dir,
    write: w,
    rm: (p) => fs.rmSync(path.join(dir, p)),
    commit: (msg = "change") => { git(dir, "add", "-A"); git(dir, "commit", "-qm", msg, "--allow-empty"); },
    mv: (a, b) => git(dir, "mv", a, b),
  };
}
