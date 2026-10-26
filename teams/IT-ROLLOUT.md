# Mochi for Teams: IT rollout guide

Mochi is a small desktop app (Windows 10/11, macOS 12+). It runs fully on the laptop: no account, no login, no cloud chat.

## 1. Install

**Windows.** Deploy the Microsoft Store app through Intune, or deploy the NSIS installer silently:

```
Mochi-Setup-<version>.exe /S
```

**Mac.** Deploy the `.dmg` through your MDM (Jamf, Kandji, Intune).

## 2. Connect it to your company (optional, no typing for staff)

Place a file called `mochi-teams.json` at:

| OS | Path |
|---|---|
| Windows | `%ProgramData%\Mochi\mochi-teams.json` |
| macOS | `/Library/Application Support/Mochi/mochi-teams.json` |

```json
{
  "id": "acme",
  "code": "ACME-2026",
  "name": "Acme Pvt Ltd",
  "autoJoin": true,
  "support": [
    { "name": "Acme Care EAP (free, confidential, 24/7)", "number": "1800-XXX-XXXX" },
    { "name": "Your HR partner", "number": "people@acme.com" }
  ],
  "posh": { "name": "Internal Committee (POSH)", "number": "ic@acme.com" },
  "teams": ["Engineering", "Sales", "Customer Support"]
}
```

- `autoJoin: true` joins everyone on that laptop to the company at next start. Without it, people type the `code` in **Mochi for Teams** in the tray menu.
- `support` (up to 4) and `posh` are shown first whenever someone shares something heavy with Mochi, before the national helplines.
- `teams` is the list people pick their team from. Keep each team at 8 people or more; smaller ones are hidden on the dashboard anyway.
- Unknown fields are ignored. Text is trimmed to short lengths.

## 3. What the app needs

- No admin rights to run. No inbound ports.
- Insights are **off** until each person turns them on. When the Pulse dashboard is live, the app sends one small JSON of weekly counts over HTTPS. The Teams window shows the exact content.
- Data stays in the user's app data folder (`%AppData%\Mochi` / `~/Library/Application Support/Mochi`).

## 4. Try it first

Install Mochi, open the tray menu, choose **Mochi for Teams** and enter `MOCHI-DEMO-2026`. That loads a demo company with sample contacts.
