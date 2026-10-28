-- Keeps the promise that weekly packets are deleted after a year: runs
-- prune_packets() every Sunday at 03:17 UTC with pg_cron (built into
-- Supabase). Where pg_cron isn't available, such as the test database, the
-- schedule is skipped and ADMIN.md says how to run it by hand.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('mochi-prune-packets', '17 3 * * 0', 'select prune_packets()');
  end if;
end $$;

-- Only the server itself runs the clean-up.
revoke execute on function prune_packets() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function prune_packets() from anon, authenticated;
  end if;
end $$;
