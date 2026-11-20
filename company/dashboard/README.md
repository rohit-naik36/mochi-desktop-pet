# Live dashboard

A real-time view of the company, run on the CEO's Mac.

```
node company/dashboard/server.mjs
```

Open **http://127.0.0.1:7777**. It refreshes every 15 seconds and the timers tick every second.

## What it shows

| Panel | Detail |
|---|---|
| Header | Company mode (ON / PAUSED / OFF) and buttons: Run dev cycle, Run standup, Pause, Resume (each asks to confirm) |
| Tiles | Runs in progress, recent failures, issues ready / in progress / in review, open PRs |
| Alerts | Unknown mode, runs over 45 min, a workflow failing 3 times in a row, issues stuck in progress for over 3 h, blocked issues, PRs waiting on fixes for over 6 h, anything needing your decision |
| Live now | Every running workflow, each job and each step with its own live timer |
| Work board | Issues by status: Ready, In progress, In review, Blocked |
| Pull requests | Open PRs with every check |
| HQ | Daily briefs and approval requests from the private HQ repo |
| Recent runs | Last 30 runs; click one to read its log (last 400 lines) |

## Limits (honest)

- GitHub publishes a job's full log only after that job finishes. While an agent runs, you see live
  **steps**, not every tool call. Per-tool-call live detail comes with the Mac runner (M3), whose
  agents stream their output locally.
- Data comes from `gh` as you are logged in on this Mac. Nothing is stored and no token is read.

## Safety

- Listens on 127.0.0.1 only and refuses other Host headers (DNS rebinding).
- Buttons need a per-launch secret and same-origin requests, so other websites can't trigger them.
- Only four fixed actions exist; nothing from the browser reaches a command line except a numeric run id.
- `company/dashboard/` is a protected path: agents cannot change code that runs with your credentials.

Options: `PORT`, `POLL_MS` (min 5000), `CODE_REPO`, `HQ_REPO`.
