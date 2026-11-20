#!/usr/bin/env node
// Little Smoke Studio — live company dashboard.
// Runs on the CEO's Mac only. Reads GitHub through the logged-in `gh` CLI, so no token is
// stored or exposed. Listens on 127.0.0.1 only. No dependencies.
//
//   node company/dashboard/server.mjs            # then open http://127.0.0.1:7777
//   PORT=8080 CODE_REPO=owner/repo HQ_REPO=owner/hq node company/dashboard/server.mjs
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { computeAlerts, summarize } from "./alerts.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 7777);
const HOST = "127.0.0.1";
const CODE_REPO = process.env.CODE_REPO || "rohit-naik36/mochi-desktop-pet";
const HQ_REPO = process.env.HQ_REPO || "rohit-naik36/little-smoke-hq";
const POLL_MS = Math.max(5000, Number(process.env.POLL_MS || 15000));
const REPO_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;
const GH = process.env.GH_BIN || "gh";
// Per-process secret: the page gets it, other websites cannot. Every action must send it.
const SESSION = crypto.randomBytes(24).toString("hex");

for (const r of [CODE_REPO, HQ_REPO]) if (!REPO_RE.test(r)) { console.error(`invalid repo name: ${r}`); process.exit(1); }

function gh(args, timeout = 60000) {
  return new Promise((resolve, reject) => {
    execFile(GH, args, { timeout, maxBuffer: 30 * 1024 * 1024, encoding: "utf8" }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim().split("\n").slice(-1)[0]));
      else resolve(stdout.trim());
    });
  });
}
const ghJson = async (args) => JSON.parse((await gh(args)) || "null");

const RUN_FIELDS = "databaseId,workflowName,displayTitle,status,conclusion,event,headBranch,createdAt,updatedAt,url";

let snapshot = { at: null, mode: null, runs: [], issues: [], prs: [], hqIssues: [], jobs: {}, alerts: [], summary: {}, errors: [] };
const clients = new Set();

async function poll() {
  const errors = [];
  const safe = async (label, fn, fallback) => { try { return await fn(); } catch (e) { errors.push(`${label}: ${e.message}`); return fallback; } };
  const [mode, runs, issues, prs, hqIssues] = await Promise.all([
    safe("mode", () => gh(["variable", "get", "COMPANY_MODE", "-R", CODE_REPO]), null),
    safe("runs", () => ghJson(["run", "list", "-R", CODE_REPO, "--limit", "30", "--json", RUN_FIELDS]), []),
    safe("issues", () => ghJson(["issue", "list", "-R", CODE_REPO, "--state", "open", "--limit", "50", "--json", "number,title,labels,updatedAt,url,assignees"]), []),
    safe("prs", () => ghJson(["pr", "list", "-R", CODE_REPO, "--state", "open", "--limit", "30", "--json", "number,title,headRefName,baseRefName,labels,updatedAt,url,isDraft,statusCheckRollup"]), []),
    safe("hq", () => ghJson(["issue", "list", "-R", HQ_REPO, "--state", "open", "--limit", "30", "--json", "number,title,labels,updatedAt,url"]), []),
  ]);
  // Live step-by-step progress for every run that is still going.
  const jobs = {};
  await Promise.all(runs.filter((r) => r.status !== "completed").map(async (r) => {
    jobs[r.databaseId] = await safe(`jobs ${r.databaseId}`, async () => (await ghJson(["run", "view", String(r.databaseId), "-R", CODE_REPO, "--json", "jobs"])).jobs, []);
  }));
  const s = { at: new Date().toISOString(), mode, runs, issues, prs, hqIssues, jobs, errors, codeRepo: CODE_REPO, hqRepo: HQ_REPO, pollMs: POLL_MS };
  s.alerts = computeAlerts(s);
  s.summary = summarize(s);
  snapshot = s;
  const msg = `data: ${JSON.stringify(s)}\n\n`;
  for (const res of clients) res.write(msg);
}

async function loop() {
  try { await poll(); } catch (e) { console.error("poll failed:", e.message); }
  setTimeout(loop, POLL_MS);
}

// The only actions the page can trigger. Fixed argument arrays; nothing from the request
// reaches a command line except a validated run id.
const ACTIONS = {
  pause: () => gh(["variable", "set", "COMPANY_MODE", "--body", "pause", "-R", CODE_REPO]),
  resume: () => gh(["variable", "set", "COMPANY_MODE", "--body", "on", "-R", CODE_REPO]),
  "run-dev": () => gh(["workflow", "run", "company-dev-cycle.yml", "-R", CODE_REPO]),
  "run-standup": () => gh(["workflow", "run", "company-standup.yml", "-R", CODE_REPO]),
};

const stripAnsi = (t) => t.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function sameOrigin(req) {
  const o = req.headers.origin;
  return !o || o === `http://${HOST}:${PORT}` || o === `http://localhost:${PORT}`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  // Refuse DNS-rebinding: only our own host names are accepted.
  if (![`${HOST}:${PORT}`, `localhost:${PORT}`].includes(req.headers.host)) return send(res, 403, { error: "bad host" });

  if (req.method === "GET" && url.pathname === "/") {
    const html = fs.readFileSync(path.join(HERE, "index.html"), "utf8").replace("__SESSION__", SESSION);
    return send(res, 200, html, "text/html; charset=utf-8");
  }
  if (req.method === "GET" && url.pathname === "/api/snapshot") return send(res, 200, snapshot);
  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  const m = url.pathname.match(/^\/api\/run\/([1-9][0-9]{0,14})\/log$/);
  if (req.method === "GET" && m) {
    try {
      const log = stripAnsi(await gh(["run", "view", m[1], "-R", CODE_REPO, "--log"], 120000));
      return send(res, 200, { lines: log.split("\n").slice(-400) });
    } catch (e) {
      return send(res, 200, { lines: [`Log not available yet: ${e.message}`, "GitHub releases a job's log when that job finishes; live progress is shown as steps above."] });
    }
  }
  if (req.method === "POST" && url.pathname === "/api/action") {
    if (!sameOrigin(req) || req.headers["x-session"] !== SESSION) return send(res, 403, { error: "forbidden" });
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1000) req.destroy(); });
    req.on("end", async () => {
      let action;
      try { action = JSON.parse(body).action; } catch { return send(res, 400, { error: "bad json" }); }
      if (!Object.hasOwn(ACTIONS, action)) return send(res, 400, { error: "unknown action" });
      try {
        await ACTIONS[action]();
        console.log(`${new Date().toISOString()} action: ${action}`);
        setTimeout(() => poll().catch(() => {}), 1500);
        return send(res, 200, { ok: true });
      } catch (e) { return send(res, 500, { error: e.message }); }
    });
    return;
  }
  send(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`Dashboard: http://${HOST}:${PORT}  (code: ${CODE_REPO}, hq: ${HQ_REPO}, refresh every ${POLL_MS / 1000}s)`);
  loop();
});
