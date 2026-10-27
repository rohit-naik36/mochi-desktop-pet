-- Mochi for Teams server: companies, seat check-ins, anonymous weekly totals
-- and HR access keys for Mochi Pulse.
--
-- Nothing here is reachable from the public API: row level security is on
-- and there are no policies, so only the server functions (which use the
-- database connection directly) can read or write. Companies are set up by
-- Little Smoke Studio in the Supabase table editor (see ../ADMIN.md).

create table companies (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  code text not null unique check (code ~ '^[A-Z0-9-]{6,40}$'),
  -- After a code reset the old one keeps working until this date, so IT has
  -- time to push the new one.
  old_code text unique check (old_code is null or old_code ~ '^[A-Z0-9-]{6,40}$'),
  old_code_until date,
  -- Company-laptop lock. Either can be empty; when set, the app only turns
  -- company features on for laptops joined to this Entra tenant or domain.
  tenant_id text,
  domain text,
  seats int not null default 0,          -- committed seats on the contract
  welcome text not null default '',      -- a short note from HR shown at join
  support jsonb not null default '[]',   -- [{ "name": "...", "number": "..." }], up to 4
  posh jsonb,                            -- { "name": "...", "number": "..." }
  teams jsonb not null default '[]',     -- ["Engineering", "Sales", ...]
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per laptop per month. `install` is a hash of a hash: the app sends
-- a company-specific hash of the laptop's own id, and the server hashes it
-- again with a secret, so the value can't be matched to a laptop elsewhere.
create table seats (
  company_id text not null references companies(id) on delete cascade,
  month date not null,
  install text not null,
  first_seen date not null default current_date,
  primary key (company_id, month, install)
);

-- One row per laptop per week, with counts only. There is deliberately no
-- install id, no IP and only the day it arrived, so a row can't be tied
-- back to a seat check-in or a person.
create table packets (
  id bigint generated always as identity primary key,
  company_id text not null references companies(id) on delete cascade,
  team text,
  week date not null,
  data jsonb not null,
  received date not null default current_date
);
create index packets_company_week on packets (company_id, week);

-- Keys HR uses to open Mochi Pulse. Only a hash is stored; the key itself
-- is shown once when it is made (see ADMIN.md).
create table pulse_keys (
  key_hash text primary key,
  company_id text not null references companies(id) on delete cascade,
  label text not null default '',
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_used date
);

alter table companies enable row level security;
alter table seats enable row level security;
alter table packets enable row level security;
alter table pulse_keys enable row level security;

-- Active seats per company per month, for invoices and the seat view.
create view seat_months with (security_invoker = true) as
  select c.id as company_id, c.name, s.month, count(*) as active_seats, c.seats as committed
  from seats s join companies c on c.id = s.company_id
  group by c.id, c.name, s.month, c.seats;

-- Weekly packets are kept for a year, then deleted.
create or replace function prune_packets() returns void language sql as $$
  delete from packets where week < current_date - interval '53 weeks';
$$;
