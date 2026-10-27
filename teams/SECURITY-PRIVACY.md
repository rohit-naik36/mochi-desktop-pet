# Mochi for Teams: security and privacy pack

For IT, security and legal teams reviewing Mochi for Teams. Little Smoke Studio (Unorthologic LLP) can sign a data processing agreement on these terms.

> Items marked **[confirm]** are commitments Little Smoke Studio must confirm before sending this to a customer.

## In one paragraph

Mochi runs on each employee's laptop. What people type, their moods and their gratitude notes never leave it. The company edition adds two small, documented messages: a daily licence check that counts the laptop as a seat, and, only for people who opt in, one file of weekly counts. Neither carries a name, email or usable device id. HR sees totals for groups of 8 or more people, rounded to the nearest 5, in Mochi Pulse.

## What data exists and where

| Data | Kept where | Sent to the server? | Kept for |
|---|---|---|---|
| Words typed into Mochi (worries, names) | Never kept; read in memory to reply | Never | Not kept |
| Moods, gratitude notes, settings, badges | The employee's laptop | Never | Until the app is uninstalled |
| Weekly counts (mood levels, worry themes, reminders, breaks, calls, features) | Laptop, 8 weeks | Only if the employee opts in, one finished week at a time | 1 year on the server |
| Answer to the company's weekly question (an option number, such as 2) | Laptop, 8 weeks | Only if the employee opts in to team totals, inside that week's counts | 1 year on the server |
| Licence check: join code, hashed laptop id, app version, Entra tenant or domain | Laptop | Daily | Company and month only, while the company is a customer |
| Company settings: name, support contacts, team names, welcome note | Server | Sent to the laptops | While the company is a customer |
| HR Pulse keys | Server, as a SHA-256 hash only | | Until revoked |

There is no user account, no email address, no IP address stored, no analytics and no advertising.

## How anonymity is kept

- **On the laptop first.** Counting happens in the app. Free text is never counted, only fixed categories (for example "deadlines", never the sentence).
- **No id on totals.** The weekly file has no laptop id. It is sent at a random time in the 36 hours after the week ends, apart from the licence check, so the two can't be matched by timing. The server stores only the day it arrived.
- **Seat ids can't be traced.** The laptop sends a one-way hash of its Windows machine id. The server hashes it again with a secret before storing it, so even a stored value can't be matched to a laptop.
- **Groups of 8 or more.** Pulse never shows a team, or a week, with fewer than 8 people. Counts are rounded to the nearest 5.
- **Opt-in and visible.** Each person chooses on a one-time screen and can preview exactly what is sent in the Mochi for Teams window. They can turn it off or leave at any time.
- **Weekly questions.** Answers are option numbers inside the weekly counts, shown only once 8 or more people in a group have answered. Questions are about work and the workplace; Little Smoke Studio declines questions about health conditions or anything that could single someone out.
- **No drill-down.** There is no screen, export or query in Pulse that shows one person. The raw weekly files are not readable by HR at all.

## How it flows

```
Laptop (Mochi)                       Mochi for Teams server (Mumbai)          HR (Mochi Pulse)
  counts by category  --weekly, opt-in, no id-->  packets table  --8+ only, rounded-->  team totals
  licence check  --daily, hashed id-->  seats table (company + month)  -->  seat count
  <-- company contacts, teams, welcome note
```

## Hosting and security

- **Hosting:** Supabase, region ap-south-1 (Mumbai, India), on Amazon Web Services. Data stays in India.
- **In transit:** HTTPS (TLS 1.2+) for every call.
- **At rest:** encrypted by the hosting provider (AES-256).
- **Access:** row level security is on for every table with no public policies, so nothing is readable through the public API. Only the three server functions can read or write. Pulse keys are random 32-character keys, stored hashed, one per HR person, revocable.
- **Abuse limits:** the server refuses requests over 16 KB, and accepts at most twice a company's seat count of weekly packets each week, so a leaked join code can't flood the totals. A leaked code can also be replaced at once, with the old one kept working for a short handover period.
- **Admin access:** only Little Smoke Studio, with two-factor sign-in to the hosting console **[confirm 2FA is on]**.
- **App:** distributed through the Microsoft Store (signed and malware-scanned by Microsoft). It needs no admin rights and opens no inbound ports. It does not read files, the screen, keystrokes or other apps' content. Silent mode checks only whether the microphone or camera is in use (yes or no).
- **Code:** the source is in a private-by-licence repository; every change runs automated tests.
- **Certifications:** none yet. ISO 27001 is on the roadmap once there are enough customers to justify it.

## Retention and deletion

- Weekly totals: deleted after 1 year, by a clean-up job that runs every Sunday.
- Seat records: kept while the company is a customer, for billing.
- When a company leaves, all its data (settings, seats, totals and keys) is deleted on request, within 30 days **[confirm]**.
- An employee can delete everything on their laptop by uninstalling Mochi. Totals already sent have no id, so they can't be singled out for deletion, which is also why they can't identify anyone.

## DPDP Act, 2023

- The company decides to use Mochi for Teams for its staff; Little Smoke Studio processes the licence check and the opted-in totals on the company's behalf. Counsel should confirm the roles for each customer.
- Employees see a clear notice and give consent on the one-time screen before any totals are sent, and can withdraw it in one click.
- Purpose is limited to wellbeing totals and seat counting. Nothing is used for performance management, sold or shared.
- Breaches: Little Smoke Studio will tell the company without delay, and within 72 hours of becoming aware **[confirm]**, so the company can meet its own obligations.

## Common questionnaire answers

| Question | Answer |
|---|---|
| Does the app collect personal data? | Not on the server, apart from a hashed laptop id for the seat count. Personal content stays on the laptop. |
| SSO? | Not needed: employees have no account. HR uses a personal Pulse key. Microsoft sign-in for Pulse is planned. |
| Where is data stored? | Mumbai, India (Supabase on AWS ap-south-1). |
| Subprocessors | Supabase Inc. (hosting and database). |
| Can HR see what an employee wrote? | No. Words never leave the laptop. |
| Can a manager identify a person? | No. Groups under 8 are hidden, numbers are rounded, and there is no per-person data on the server. |
| Network requirements | Outbound HTTPS to `*.supabase.co` only. |
| What if the server is down? | Mochi keeps working. Company features pause only after 45 days without a check. |
| How strong is the company-laptop lock? | It stops company features on personal laptops in everyday use: the laptop reports the Entra tenant or domain it is joined to, and the server compares it with yours. It is a policy control, not device attestation; someone who copies the code and fakes those values on purpose could still join, which only adds one anonymous seat. Your MDM's own compliance rules remain the real guarantee. |
| Pen test? | Not yet **[confirm before claiming one]**. |

## Data processing agreement: outline

1. Parties, and the services covered (Mochi for Teams and Mochi Pulse).
2. Data covered: the table above, nothing more.
3. Purpose: wellbeing totals and seat counting only.
4. Location: India.
5. Security measures: as in this pack.
6. Subprocessors: Supabase; 30 days' notice before adding one.
7. Breach notice: within 72 hours.
8. Retention and deletion at the end of the contract.
9. The company's right to audit this document's claims once a year.
