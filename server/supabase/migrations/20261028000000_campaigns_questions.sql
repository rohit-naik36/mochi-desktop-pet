-- Mochi for Teams, set 2: wellness campaigns and one-question check-ins.
-- Both are set up by Little Smoke Studio with the company, in the table
-- editor (see ../ADMIN.md), and reach the laptops at their next check-in.

-- Themed weeks Mochi delivers as friendly lines, for example
-- [{ "id": "hydrate-nov", "theme": "hydration", "start": "2026-11-16",
--    "end": "2026-11-20", "note": "Free fruit and water at the pantry all week!" }]
-- `theme` is one of the themes built into the app (src/campaigns.js).
alter table companies add column campaigns jsonb not null default '[]';

-- Anonymous weekly questions, for example
-- [{ "id": "workload-1", "text": "How manageable was your workload this week?",
--    "options": ["Very", "Mostly", "Not really", "Not at all"],
--    "start": "2026-11-16", "end": "2026-11-22" }]
-- Answers arrive inside the weekly totals (no laptop id) as an option number,
-- and Pulse shows them only as totals for groups of 8 or more.
alter table companies add column questions jsonb not null default '[]';
