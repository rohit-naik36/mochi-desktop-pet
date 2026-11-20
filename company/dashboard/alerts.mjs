// Pure functions for the live dashboard: turn a GitHub snapshot into alerts.
// No I/O here, so the rules are unit-tested (company/test/dashboard.test.mjs).

export const LIMITS = {
  longRunMinutes: 45,      // an agent run older than this is probably stuck
  stuckIssueHours: 3,      // status:in-progress with no update for this long
  stalePrHours: 6,         // changes-requested PR with no update for this long
  failStreak: 3,           // this many failures in a row for one workflow = loop
};

const minutesSince = (iso, now) => (now - Date.parse(iso)) / 60000;
const labelNames = (x) => (x.labels || []).map((l) => (typeof l === "string" ? l : l.name));

/** Returns [{ level: "critical"|"warn"|"info", kind, text, url }] sorted by level. */
export function computeAlerts(snap, now = Date.now(), limits = LIMITS) {
  const out = [];
  const mode = snap.mode;
  if (mode !== "on" && mode !== "pause" && mode !== "off") {
    out.push({ level: "critical", kind: "mode", text: `COMPANY_MODE is "${mode ?? "unset"}"; the company fails closed.` });
  } else if (mode !== "on") {
    out.push({ level: "info", kind: "mode", text: `Company is ${mode === "pause" ? "paused: only the daily brief runs" : "off: nothing runs"}.` });
  }

  for (const r of snap.runs || []) {
    if (r.status !== "completed" && r.createdAt && minutesSince(r.createdAt, now) > limits.longRunMinutes) {
      out.push({ level: "warn", kind: "long-run", text: `${r.workflowName} has been running ${Math.round(minutesSince(r.createdAt, now))} min.`, url: r.url });
    }
  }

  // Failure streaks per workflow, newest first.
  const byWf = new Map();
  for (const r of [...(snap.runs || [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
    if (r.status !== "completed" || r.conclusion === "skipped") continue;
    if (!byWf.has(r.workflowName)) byWf.set(r.workflowName, []);
    byWf.get(r.workflowName).push(r);
  }
  for (const [wf, runs] of byWf) {
    let streak = 0;
    for (const r of runs) { if (r.conclusion === "failure") streak++; else break; }
    if (streak >= limits.failStreak) {
      out.push({ level: "critical", kind: "fail-loop", text: `${wf} failed ${streak} times in a row.`, url: runs[0].url });
    } else if (streak > 0) {
      out.push({ level: "warn", kind: "failed", text: `${wf}: last run failed.`, url: runs[0].url });
    }
  }

  for (const i of snap.issues || []) {
    const labels = labelNames(i);
    if (labels.includes("status:in-progress") && minutesSince(i.updatedAt, now) > limits.stuckIssueHours * 60) {
      out.push({ level: "warn", kind: "stuck-issue", text: `#${i.number} "${i.title}" in progress with no update for ${Math.round(minutesSince(i.updatedAt, now) / 60)} h.`, url: i.url });
    }
    if (labels.includes("status:blocked")) {
      out.push({ level: "warn", kind: "blocked", text: `#${i.number} "${i.title}" is blocked.`, url: i.url });
    }
  }

  for (const p of snap.prs || []) {
    const labels = labelNames(p);
    if (labels.includes("changes-requested") && minutesSince(p.updatedAt, now) > limits.stalePrHours * 60) {
      out.push({ level: "warn", kind: "stale-pr", text: `PR #${p.number} waiting on fixes for ${Math.round(minutesSince(p.updatedAt, now) / 60)} h.`, url: p.url });
    }
    if (labels.includes("ceo-approval")) {
      out.push({ level: "critical", kind: "needs-ceo", text: `PR #${p.number} "${p.title}" needs your decision.`, url: p.url });
    }
  }

  for (const i of snap.hqIssues || []) {
    if (labelNames(i).includes("ceo-approval")) {
      out.push({ level: "critical", kind: "needs-ceo", text: `HQ #${i.number} "${i.title}" needs your decision.`, url: i.url });
    }
  }

  if (snap.errors?.length) {
    out.push({ level: "warn", kind: "dashboard", text: `Some data could not be loaded: ${snap.errors.join("; ")}` });
  }

  const rank = { critical: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/** Short summary numbers for the header tiles. */
export function summarize(snap) {
  const runs = snap.runs || [];
  const issues = snap.issues || [];
  const has = (x, l) => (x.labels || []).some((y) => (y.name ?? y) === l);
  return {
    running: runs.filter((r) => r.status !== "completed").length,
    failed24h: runs.filter((r) => r.conclusion === "failure").length,
    ready: issues.filter((i) => has(i, "status:ready")).length,
    inProgress: issues.filter((i) => has(i, "status:in-progress")).length,
    inReview: issues.filter((i) => has(i, "status:review")).length,
    openPrs: (snap.prs || []).length,
  };
}
