# Mochi for Teams: IT rollout guide

Mochi is a desktop app for Windows 10 and 11. Staff don't create accounts or sign in. Everything personal stays on the laptop; the only network traffic is a daily licence check and, for people who opt in, one small file of weekly counts (details in `SECURITY-PRIVACY.md`).

## 1. Install Mochi for Teams through Intune

Your company gets its own installer, `Mochi-Teams-Setup-<version>.exe`, from Little Smoke Studio. It is the free Mochi plus **smarter replies**: a small AI model (Qwen, Apache 2.0 licence) that runs entirely on the laptop and never sends anything out. That is why the installer is about 1.4 GB. The free Microsoft Store version doesn't include it.

1. Wrap the installer with the [Microsoft Win32 Content Prep Tool](https://learn.microsoft.com/intune/intune-service/apps/apps-win32-prepare): `IntuneWinAppUtil.exe -c <folder> -s Mochi-Teams-Setup-<version>.exe -o <out>`.
2. Intune admin centre > **Apps > Windows > Add > Windows app (Win32)** and upload the `.intunewin` file.
3. Install command: `Mochi-Teams-Setup-<version>.exe /S`
4. Uninstall command: `"%LocalAppData%\Programs\mochi-desktop-pet\Uninstall Mochi.exe" /S`
5. Install behaviour: **User**. Detection rule: file `%LocalAppData%\Programs\mochi-desktop-pet\Mochi.exe` exists.
6. Assign it to the group that has Mochi for Teams, for example `Engineering`.

No admin rights are needed to install or run it, and it opens no inbound ports. Smarter replies needs about 2 GB of free memory while someone is chatting and unloads itself after 10 minutes. It switches on only while the laptop is joined to your company, and each person can turn it off in Settings.

**Updates:** we send you each new installer; upload it as a new version of the same Intune app (the detection rule stays the same).

If someone already has the free Store version, they can keep it, but they won't get smarter replies; the company installer is a separate app.

## 2. Connect it to your company (no typing for staff)

Push one small file to the same group. It holds only your join code; your company's support contacts, team list and welcome note come from the Mochi for Teams server and stay up to date by themselves.

Path: `%ProgramData%\Mochi\mochi-teams.json`

```json
{ "code": "YOUR-JOIN-CODE", "name": "Your Company Name", "autoJoin": true }
```

The easiest way is an Intune **platform script** (Devices > Scripts and remediations > Platform scripts > Add > Windows 10 and later), run as system, assigned to the same group:

```powershell
$dir = Join-Path $env:ProgramData 'Mochi'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
@'
{ "code": "YOUR-JOIN-CODE", "name": "Your Company Name", "autoJoin": true }
'@ | Set-Content -Path (Join-Path $dir 'mochi-teams.json') -Encoding UTF8
```

At its next start, Mochi joins the company and shows each person a one-time screen asking whether to add their counts to the team totals. It is off until they say yes.

Without the file, people can join by opening **Mochi for Teams** in Mochi's tray menu and typing the code.

## 3. Company-laptop lock

When your account is set up with your Microsoft Entra tenant id (or your on-premises AD domain), company features only switch on for laptops joined to it (Entra joined or hybrid joined). On a personal laptop the same code is refused, and the person just has the free Mochi. Mochi reads this with `dsregcmd /status` and the `USERDNSDOMAIN` variable; it never reads user accounts or credentials.

Send us your tenant id when you sign up: Entra admin centre > **Overview > Tenant ID**.

## 4. Network

Allow outbound HTTPS to `*.supabase.co` (the Mochi for Teams server, hosted in Mumbai). Nothing else is needed. If the server can't be reached, Mochi keeps working; company features pause only after 45 days without a successful check.

## 5. Checking our seat count

Each laptop counts as one seat per month it is used. Intune shows how many devices have Mochi installed (Apps > Mochi > Device install status); our monthly seat number should be the same or lower.

## 6. Removing it

Unassign the app in Intune and delete `%ProgramData%\Mochi`. Each person's own settings are in `%AppData%\Mochi` and can be deleted after uninstalling.

## Try it first

Install Mochi, open the tray menu, choose **Mochi for Teams** and enter `MOCHI-DEMO-2026`. That loads a demo company with sample contacts and works offline.
