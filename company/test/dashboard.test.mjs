import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeAlerts, summarize } from "../dashboard/alerts.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const now = Date.parse("2026-11-13T12:00:00Z");
const iso = (minAgo) => new Date(now - minAgo * 60000).toISOString();
const kinds = (s) => computeAlerts(s, now).map((a) => a.kind);

describe("dashboard alerts", () => {
  test("unknown mode is critical", () => assert.equal(computeAlerts({ mode: null }, now)[0].level, "critical"));
  test("pause is info, on is silent", () => {
    assert.deepEqual(kinds({ mode: "pause" }), ["mode"]);
    assert.deepEqual(kinds({ mode: "on" }), []);
  });
  test("a run older than 45 min is flagged", () => {
    assert.ok(kinds({ mode: "on", runs: [{ workflowName: "Dev", status: "in_progress", createdAt: iso(50) }] }).includes("long-run"));
    assert.ok(!kinds({ mode: "on", runs: [{ workflowName: "Dev", status: "in_progress", createdAt: iso(10) }] }).includes("long-run"));
  });
  test("three failures in a row is a critical loop; a success breaks the streak", () => {
    const f = (m, c) => ({ workflowName: "Dev", status: "completed", conclusion: c, createdAt: iso(m) });
    const loop = computeAlerts({ mode: "on", runs: [f(1, "failure"), f(2, "failure"), f(3, "failure")] }, now);
    assert.equal(loop.find((a) => a.kind === "fail-loop").level, "critical");
    assert.ok(!kinds({ mode: "on", runs: [f(1, "failure"), f(2, "success"), f(3, "failure"), f(4, "failure")] }).includes("fail-loop"));
  });
  test("skipped runs do not break or extend a streak", () => {
    const f = (m, c) => ({ workflowName: "Dev", status: "completed", conclusion: c, createdAt: iso(m) });
    assert.ok(kinds({ mode: "on", runs: [f(1, "failure"), f(2, "skipped"), f(3, "failure"), f(4, "failure")] }).includes("fail-loop"));
  });
  test("stuck in-progress issue and blocked issue are flagged", () => {
    const k = kinds({ mode: "on", issues: [
      { number: 1, title: "a", labels: [{ name: "status:in-progress" }], updatedAt: iso(240) },
      { number: 2, title: "b", labels: [{ name: "status:blocked" }], updatedAt: iso(1) }] });
    assert.ok(k.includes("stuck-issue") && k.includes("blocked"));
  });
  test("CEO approvals in the code repo and HQ are critical", () => {
    const a = computeAlerts({ mode: "on", prs: [{ number: 5, title: "x", labels: [{ name: "ceo-approval" }], updatedAt: iso(1) }],
      hqIssues: [{ number: 2, title: "y", labels: [{ name: "ceo-approval" }] }] }, now);
    assert.equal(a.filter((x) => x.kind === "needs-ceo").length, 2);
  });
  test("critical alerts come first", () => {
    const a = computeAlerts({ mode: "pause", hqIssues: [{ number: 2, title: "y", labels: ["ceo-approval"] }] }, now);
    assert.equal(a[0].level, "critical");
  });
  test("summary counts", () => {
    const s = summarize({ runs: [{ status: "in_progress" }, { status: "completed", conclusion: "failure" }],
      issues: [{ labels: [{ name: "status:ready" }] }, { labels: ["status:in-progress"] }], prs: [{}] });
    assert.deepEqual(s, { running: 1, failed24h: 1, ready: 1, inProgress: 1, inReview: 0, openPrs: 1 });
  });
});

describe("dashboard server", () => {
  const PORT = 17777 + Math.floor(Math.random() * 1000);
  const base = `http://127.0.0.1:${PORT}`;
  let proc;
  before(async () => {
    proc = spawn(process.execPath, [path.join(HERE, "..", "dashboard", "server.mjs")], {
      env: { ...process.env, PORT: String(PORT), GH_BIN: path.join(HERE, "fixtures", "fake-gh-dashboard.mjs"), POLL_MS: "5000" }, stdio: "pipe" });
    for (let i = 0; i < 50; i++) {
      try { const r = await fetch(`${base}/api/snapshot`); const j = await r.json(); if (j.at) return; } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("server did not start");
  });
  after(() => proc?.kill());

  test("snapshot has mode, runs, live steps and issues", async () => {
    const s = await (await fetch(`${base}/api/snapshot`)).json();
    assert.equal(s.mode, "on");
    assert.equal(s.runs.length, 2);
    assert.equal(s.jobs["11"][0].steps[1].name, "Run Claude");
    assert.equal(s.issues[0].number, 18);
    assert.equal(s.hqIssues[0].number, 1);
    assert.deepEqual(s.errors, []);
  });
  test("page embeds a session secret", async () => {
    const html = await (await fetch(base + "/")).text();
    assert.ok(!html.includes("__SESSION__"));
    assert.match(html, /const SESSION = "[0-9a-f]{48}"/);
  });
  test("actions need the session secret", async () => {
    const r = await fetch(`${base}/api/action`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "pause" }) });
    assert.equal(r.status, 403);
  });
  test("actions from another origin are refused even with the secret", async () => {
    const html = await (await fetch(base + "/")).text();
    const secret = html.match(/const SESSION = "([0-9a-f]+)"/)[1];
    const r = await fetch(`${base}/api/action`, { method: "POST", headers: { "content-type": "application/json", "x-session": secret, origin: "https://evil.example" }, body: JSON.stringify({ action: "pause" }) });
    assert.equal(r.status, 403);
  });
  test("only known actions run", async () => {
    const html = await (await fetch(base + "/")).text();
    const secret = html.match(/const SESSION = "([0-9a-f]+)"/)[1];
    const post = (action) => fetch(`${base}/api/action`, { method: "POST", headers: { "content-type": "application/json", "x-session": secret }, body: JSON.stringify({ action }) });
    assert.equal((await post("rm -rf")).status, 400);
    assert.equal((await post("constructor")).status, 400);
    assert.equal((await post("pause")).status, 200);
  });
  test("log endpoint strips colour codes and rejects bad ids", async () => {
    const j = await (await fetch(`${base}/api/run/10/log`)).json();
    assert.ok(j.lines[0].includes("hello") && !j.lines[0].includes("\x1b"));
    assert.equal((await fetch(`${base}/api/run/0abc/log`)).status, 404);
  });
  test("foreign Host header is refused (DNS rebinding)", async () => {
    const http = await import("node:http");
    const code = await new Promise((res) => http.get({ host: "127.0.0.1", port: PORT, path: "/api/snapshot", headers: { host: "evil.example" } }, (r) => res(r.statusCode)));
    assert.equal(code, 403);
  });
});
