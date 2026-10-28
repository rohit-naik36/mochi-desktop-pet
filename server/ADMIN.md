# Mochi for Teams server: setup and running it

This is for Little Smoke Studio. Companies don't sign in anywhere: you set
each one up, and HR opens Mochi Pulse with a key you give them.

The server is a Supabase project (Mumbai region) with three functions:

| Function | Called by | Does |
|---|---|---|
| `checkin` | Mochi, about once a day | counts the laptop as a seat for the month, returns the company's contacts, teams, welcome note, campaigns and question |
| `totals` | Mochi, once a week, only if the person turned insights on | stores one finished week of counts, with no laptop id |
| `pulse` | Mochi Pulse | returns team totals (groups of 8+, rounded to 5), question results, campaigns and the seat count |

## 1. One-time setup

1. Create a free account at supabase.com and a new project. Region: **Mumbai (ap-south-1)**. Save the database password somewhere safe.
2. In GitHub, open the repo's **Settings > Secrets and variables > Actions** and add:
   - `SUPABASE_ACCESS_TOKEN`: from supabase.com > Account > Access tokens
   - `SUPABASE_PROJECT_REF`: the id in your project's URL (`https://supabase.com/dashboard/project/<this>`)
   - `SUPABASE_DB_PASSWORD`: the database password from step 1
   - `SEAT_PEPPER`: any long random text (it keeps seat hashes private; never change it later)
3. In GitHub **Actions**, run **Mochi for Teams server** from `main` with **Deploy** ticked. This creates the tables, deploys the functions and schedules the weekly clean-up that deletes totals older than a year. Check it under **Database > Cron**: a job called `mochi-prune-packets` should be listed. If it isn't, turn on `pg_cron` under **Database > Extensions** and run the deploy again.
4. Put the server address into the apps, then build them:
   `https://<project-ref>.supabase.co/functions/v1`
   - Mochi: `DEFAULT_SERVER` in `src/company.js`
   - Mochi Pulse: `SERVER` in `pulse/main.js`

## 2. Add a company

In Supabase, open **Table editor > companies > Insert row**:

| Column | Example | Notes |
|---|---|---|
| `id` | `acme` | lowercase, short, never changes |
| `name` | `Acme Pvt Ltd` | shown to staff |
| `code` | `ACME-7KQ2-2026` | the join code; capitals, numbers and dashes, 6 to 40 long. Make it hard to guess |
| `tenant_id` | `72f988bf-…` | their Microsoft Entra tenant id (IT can find it in the Entra admin centre). Turns on the company-laptop lock |
| `domain` | `corp.acme.com` | or their Windows domain, if they use on-premises AD |
| `seats` | `500` | committed seats on the contract |
| `welcome` | `Hi team! …` | a short note from HR, shown when people join |
| `support` | `[{"name":"Acme Care EAP (free, 24/7)","number":"1800-123-4567"},{"name":"Your HR partner","number":"people@acme.com"}]` | up to 4, shown first when someone shares something heavy |
| `posh` | `{"name":"Internal Committee (POSH)","number":"ic@acme.com"}` | |
| `teams` | `["Engineering","Sales","Customer Support"]` | the list people choose from. Teams under 8 people are hidden in Pulse |

Changes reach every laptop within a day, at its next check-in.

Then send IT the company file and guide (`teams/IT-ROLLOUT.md`) with their code filled in.

## 3. Give HR a Pulse key

    node server/tools/new-pulse-key.mjs acme "Priya Sharma, HR head"

It prints a key (give it to that person once, by a private channel) and a line of SQL. Run the SQL in Supabase **SQL editor**. One key per person, so you can switch one off without affecting others: set `revoked` to true in **pulse_keys**.

## 4. Every month: seats

In **SQL editor**:

    select * from seat_months order by month desc, name;

`active_seats` is the number of laptops that checked in that month. Bill on the committed `seats`; if active seats go above it, add the difference at the quarterly true-up. IT can check our number against the install count in Intune.

## 5. Wellness campaigns and the weekly question

Plan these with HR on your regular call, then add them to the company's row. Laptops pick them up at their next daily check-in.

**Campaigns** (`campaigns` column): a themed week Mochi delivers as its own friendly lines, once a day, with the company's note on the first day.

    [{"id":"hydrate-nov","theme":"hydration","start":"2026-11-16","end":"2026-11-20","note":"Free fruit and water at the pantry all week!"}]

- `theme`: one of `hydration`, `movement`, `eyes`, `sleep`, `gratitude`, `mental-health`, `breathe`, `kindness`. Mochi only ever says its own written lines for these; the company's words go in `note` (up to 100 characters).
- `id`: lowercase letters, numbers and dashes. Up to 8 upcoming campaigns.
- Good dates: World Mental Health Day (10 Oct, `mental-health`), the week after a big release (`sleep`), summer (`hydration`), year-end (`gratitude`).

**Weekly question** (`questions` column): one anonymous question, 2 to 5 short answers.

    [{"id":"workload-1","text":"How manageable was your workload this week?","options":["Very","Mostly","Not really","Not at all"],"start":"2026-11-16","end":"2026-11-22"}]

- Mochi asks only people who add their counts to team totals, at most every 3 hours until they answer or skip, and they answer in the Mochi for Teams window. Each person answers once per question.
- The answer travels inside that week's totals as an option number, with no laptop id. Pulse shows results only once 8 or more people in a group have answered, rounded to 5.
- Keep questions about the work and the workplace ("Did you get a proper lunch break most days?"), never about health conditions, personal life or anything that identifies someone. Turn down questions that could single out a person or a small group.
- Keep old questions in the list: Pulse shows the last 12 weeks of results.

## 6. If a join code leaks

1. Copy the current `code` into `old_code`, set `old_code_until` to about 30 days from today, and put a new code in `code`.
2. With the laptop lock on (`tenant_id` or `domain` set), company laptops move to the new code on their own. Without it, send IT the new code to push out.
3. After `old_code_until`, the old code stops working. Laptops that can't check in keep company features for 45 days, then fall back to free Mochi.

## 7. When a company leaves

Set `active` to false. Their laptops fall back to free Mochi within 45 days. To delete their data, delete the company row (seats, totals and keys go with it).

## Local testing

    cd server && bun install
    TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres bun test
    DATABASE_URL=postgres://... PORT=8787 bun test/dev-server.ts   # then MOCHI_SERVER=http://127.0.0.1:8787 npm start
