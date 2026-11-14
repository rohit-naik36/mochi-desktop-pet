#!/usr/bin/env node
// Picks the next executive task from the private HQ repo and prepares it for the exec runner.
// No AI runs here. Every HQ call goes through hq.mjs (HQ token, private-repo check, no --repo override).
//
//   node company/scripts/exec-pick.mjs                 # pick, mark in progress, write .company/task.md
//   node company/scripts/exec-pick.mjs --weekly-linkedin   # also open this week's LinkedIn task first
//
// Outputs (GITHUB_OUTPUT): number, role ("" when there is nothing to do).
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { run as hq } from "./hq.mjs";
import { clean } from "./lib.mjs";

export const ROLES = ["cpo", "coo", "cfo", "cmo"];
const names = (i) => (i.labels || []).map((l) => (typeof l === "string" ? l : l.name));
const prio = (i) => { const p = names(i).find((l) => /^priority:p[0-3]$/.test(l)); return p ? Number(p.slice(-1)) : 2; };

/** The task to run next, or null. Only the CEO's own issues are eligible. */
export function chooseTask(issues, owner) {
  const ok = (issues || []).filter((i) => {
    const l = names(i);
    const role = ROLES.filter((r) => l.includes(`role:${r}`));
    return i.author?.login === owner
      && l.includes("exec")
      && role.length === 1
      && (l.includes("status:ready") || l.includes("ceo-changes"))
      && !l.includes("status:in-progress")
      && !l.includes("ceo-approval")
      && !l.includes("status:blocked");
  });
  ok.sort((a, b) => prio(a) - prio(b) || Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (!ok.length) return null;
  const t = ok[0];
  return { number: t.number, role: ROLES.find((r) => names(t).includes(`role:${r}`)), isRevision: names(t).includes("ceo-changes"), labels: names(t) };
}

export const FAIL_MARK = "<!-- exec-runner-failure -->";
export const MAX_FAILURES = 2;

/** After a failed run: requeue, or block once the task has failed MAX_FAILURES times. */
export function releaseAction(comments) {
  const failures = (comments || []).filter((c) => (c.body || "").includes(FAIL_MARK)).length + 1;
  if (failures >= MAX_FAILURES) {
    return { label: "status:blocked", message: `${FAIL_MARK}\nThe runner failed on this task ${failures} times, so it is now blocked instead of retrying. Check the workflow run, then relabel it \`status:ready\` to try again.` };
  }
  return { label: "status:ready", message: `${FAIL_MARK}\nThe runner stopped before finishing this task (failure ${failures} of ${MAX_FAILURES}). It is back in the queue for the next run.` };
}

/** Monday of the given date's week, as YYYY-MM-DD (IST). */
export function weekOf(date = new Date()) {
  const ist = new Date(date.getTime() + 330 * 60000);
  const day = (ist.getUTCDay() + 6) % 7;
  ist.setUTCDate(ist.getUTCDate() - day);
  return ist.toISOString().slice(0, 10);
}

/** Text the research stage may see: title and body only, never comments or earlier deliverables. */
export function researchBrief(issue) {
  return `# ${clean(issue.title, 300)}\n\nRole: ${issue.role}\n\n${clean(issue.body || "", 20000)}\n`;
}

function main(argv, env) {
  const owner = env.CEO_LOGIN;
  if (!owner) throw new Error("CEO_LOGIN is not set");
  const call = (args) => hq(args, env);
  const bi = argv.indexOf("--brief");
  if (bi >= 0) {
    // Research stage: write the brief for an already-picked task (title and body only).
    const n = argv[bi + 1], role = argv[bi + 2];
    if (!/^[1-9][0-9]{0,9}$/.test(n || "") || !ROLES.includes(role)) throw new Error("usage: --brief <number> <role>");
    const issue = JSON.parse(call(["issue", "view", n, "--json", "title,body"]));
    fs.mkdirSync(".company", { recursive: true });
    fs.writeFileSync(".company/task.md", researchBrief({ ...issue, role }));
    return;
  }
  const ri = argv.indexOf("--release");
  if (ri >= 0) {
    // A stage failed: requeue the task, or block it after repeated failures (no endless retry loop).
    const n = argv[ri + 1];
    if (!/^[1-9][0-9]{0,9}$/.test(n || "")) throw new Error("usage: --release <number>");
    const { comments = [] } = JSON.parse(call(["issue", "view", n, "--json", "comments"]));
    const action = releaseAction(comments);
    call(["issue", "comment", n, "--body", action.message]);
    call(["issue", "edit", n, "--add-label", action.label, "--remove-label", "status:in-progress"]);
    console.log(action.message);
    return;
  }
  if (argv.includes("--weekly-linkedin")) {
    const title = `LinkedIn posts — week of ${weekOf()}`;
    const open = JSON.parse(call(["issue", "list", "--label", "linkedin", "--state", "all", "--limit", "50", "--json", "title"]) || "[]");
    if (!open.some((i) => i.title === title)) {
      call(["issue", "create", "--title", title, "--label", "exec,status:ready,role:cmo,linkedin,priority:p1",
        "--body", "Draft this week's 3 LinkedIn posts for the CEO to publish manually. Follow the LinkedIn section of company/playbooks/exec-task.md. Goal: build trust with HR and People leaders in Indian companies of 200–2,000 staff, towards 2 Mochi for Teams clients by 31 March 2027."]);
    }
  }
  const issues = JSON.parse(call(["issue", "list", "--label", "exec", "--state", "open", "--limit", "100", "--json", "number,title,labels,createdAt,author"]) || "[]");
  const pick = chooseTask(issues, owner);
  const out = env.GITHUB_OUTPUT;
  if (!pick) {
    console.log("No executive task is ready.");
    if (out) fs.appendFileSync(out, "number=\nrole=\n");
    return;
  }
  const remove = ["status:ready", "ceo-changes"].filter((l) => pick.labels.includes(l));
  call(["issue", "edit", String(pick.number), "--add-label", "status:in-progress", ...(remove.length ? ["--remove-label", remove.join(",")] : [])]);
  const issue = JSON.parse(call(["issue", "view", String(pick.number), "--json", "title,body"]));
  fs.mkdirSync(".company", { recursive: true });
  fs.writeFileSync(".company/task.md", researchBrief({ ...issue, role: pick.role }));
  console.log(`Picked HQ #${pick.number} for the ${pick.role.toUpperCase()}${pick.isRevision ? " (revision)" : ""}.`);
  if (out) fs.appendFileSync(out, `number=${pick.number}\nrole=${pick.role}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try { main(process.argv.slice(2), process.env); }
  catch (e) { console.error(`exec-pick failed closed: ${clean(e.message, 400)}`); process.exitCode = 1; }
}
