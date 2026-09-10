-- Therapy Practice CRM - initial schema
--
-- Design notes:
--   * The public intake form does NOT talk to this table directly. It posts to a
--     Next.js server action which validates input and inserts using the service
--     role key. That means anonymous users need no database privileges at all,
--     so RLS below is authenticated-only. Simpler and strictly safer than
--     granting anon an INSERT policy and trying to fence it in.
--   * raw_import preserves the untouched source row for anything loaded from the
--     CSV, so every normalization decision in scripts/seed.ts stays auditable.

create extension if not exists pg_trgm;

create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- identity
  client_name        text not null,
  date_of_birth      date,
  email              text,
  phone              text,

  -- insurance
  insurance          text,
  member_id          text,

  -- intake
  reason_for_visit   text,

  -- pipeline
  stage              text not null default 'New Lead',
  date_submitted     date not null default current_date,
  paperwork_complete boolean not null default false,
  notes              text,

  -- provenance
  source             text not null default 'manual',
  raw_import         jsonb,

  constraint clients_stage_valid check (stage in (
    'New Lead', 'Contacted', 'Verified', 'Booked', 'Paperwork Pending', 'Active'
  )),
  constraint clients_source_valid check (source in (
    'intake_form', 'csv_import', 'manual'
  )),
  constraint clients_name_not_blank check (length(btrim(client_name)) > 0)
);

comment on column public.clients.raw_import is
  'Untouched original row for CSV-imported records. Null for records created in-app.';
comment on column public.clients.source is
  'How the record entered the system: intake_form, csv_import, or manual.';

-- keep updated_at honest
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- Indexes for the filters the brief calls for: name, stage, DOB, insurance.
-- Trigram index on the name supports fuzzy/partial search (ILIKE '%partial%'),
-- which a plain btree cannot use.
create index clients_name_trgm_idx on public.clients using gin (client_name gin_trgm_ops);
create index clients_stage_idx          on public.clients (stage);
create index clients_date_of_birth_idx  on public.clients (date_of_birth);
create index clients_insurance_idx      on public.clients (insurance);
create index clients_date_submitted_idx on public.clients (date_submitted desc);

-- Row Level Security: deny by default, then allow signed-in staff.
-- No anon policy exists, so anonymous requests can neither read nor write,
-- even if the anon key leaks.
alter table public.clients enable row level security;

create policy "staff can read all clients"
  on public.clients for select
  to authenticated
  using (true);

create policy "staff can insert clients"
  on public.clients for insert
  to authenticated
  with check (true);

create policy "staff can update clients"
  on public.clients for update
  to authenticated
  using (true)
  with check (true);

create policy "staff can delete clients"
  on public.clients for delete
  to authenticated
  using (true);
