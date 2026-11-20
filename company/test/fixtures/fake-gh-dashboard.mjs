#!/usr/bin/env node
// Fake gh for dashboard tests: canned answers keyed on the subcommand.
const a = process.argv.slice(2);
const now = Date.now();
const iso = (minAgo) => new Date(now - minAgo * 60000).toISOString();
const out = (x) => process.stdout.write(typeof x === "string" ? x : JSON.stringify(x));
if (a[0] === "variable" && a[1] === "get") out("on");
else if (a[0] === "variable" && a[1] === "set") out("");
else if (a[0] === "workflow" && a[1] === "run") out("");
else if (a[0] === "run" && a[1] === "list") out([
  { databaseId: 11, workflowName: "Company · Dev cycle", displayTitle: "Company · Dev cycle", status: "in_progress", conclusion: "", event: "workflow_dispatch", headBranch: "main", createdAt: iso(5), updatedAt: iso(1), url: "https://github.com/o/r/actions/runs/11" },
  { databaseId: 10, workflowName: "Company · Daily standup", displayTitle: "Company · Daily standup", status: "completed", conclusion: "success", event: "workflow_dispatch", headBranch: "main", createdAt: iso(60), updatedAt: iso(59), url: "https://github.com/o/r/actions/runs/10" },
]);
else if (a[0] === "run" && a[1] === "view" && a.includes("--log")) out("job\tstep\t2026 \x1b[36mhello\x1b[0m\nline2");
else if (a[0] === "run" && a[1] === "view") out({ jobs: [{ name: "build", status: "in_progress", steps: [{ name: "Checkout", status: "completed", conclusion: "success" }, { name: "Run Claude", status: "in_progress", startedAt: iso(2) }] }] });
else if (a[0] === "issue" && a.some((x) => x.endsWith("/little-smoke-hq"))) out([{ number: 1, title: "Daily brief", labels: [{ name: "daily-brief" }], updatedAt: iso(30), url: "https://github.com/o/hq/issues/1" }]);
else if (a[0] === "issue") out([{ number: 18, title: "Seed CONTEXT.md", labels: [{ name: "status:in-progress" }], updatedAt: iso(4), url: "https://github.com/o/r/issues/18" }]);
else if (a[0] === "pr") out([]);
else { process.stderr.write("unexpected: " + a.join(" ")); process.exit(1); }
