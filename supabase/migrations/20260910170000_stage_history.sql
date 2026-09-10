-- Stage history: who moved which client to which stage, and when.
--
-- Written by a trigger, never by the app directly, so it cannot be skipped or
-- forged from application code. Staff writes go through the user's own session
-- (not the service key), so auth.uid() inside the trigger is the staff member
-- who made the change. Intake-form and CSV writes run as service_role, where
-- auth.uid() is null -- recorded as such, meaning "system", which is accurate.

create table public.client_stage_history (
  id               bigint generated always as identity primary key,
  client_id        uuid not null references public.clients(id) on delete cascade,
  from_stage       text,                          -- null for the row's creation
  to_stage         text not null,
  changed_at       timestamptz not null default now(),
  changed_by       uuid references auth.users(id) on delete set null,
  changed_by_email text                           -- denormalized: auth.users is not readable by the app
);

create index client_stage_history_client_idx
  on public.client_stage_history (client_id, changed_at desc);

-- security definer: the function runs with its owner's privileges, so it can
-- insert into the history table even though staff hold no insert grant on it.
-- The fixed search_path prevents the usual security-definer hijack.
create or replace function public.record_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.client_stage_history (client_id, from_stage, to_stage, changed_by, changed_by_email)
    values (new.id, null, new.stage, auth.uid(), auth.jwt() ->> 'email');
  elsif new.stage is distinct from old.stage then
    insert into public.client_stage_history (client_id, from_stage, to_stage, changed_by, changed_by_email)
    values (new.id, old.stage, new.stage, auth.uid(), auth.jwt() ->> 'email');
  end if;
  return new;
end;
$$;

create trigger clients_record_stage_change
  after insert or update of stage on public.clients
  for each row execute function public.record_stage_change();

-- Read-only for staff. No insert/update/delete grant: the trigger is the only writer.
grant select on public.client_stage_history to authenticated;
grant all    on public.client_stage_history to service_role;

alter table public.client_stage_history enable row level security;

create policy "staff can read stage history"
  on public.client_stage_history for select
  to authenticated
  using (true);

-- Backfill: one "created" entry per existing client so history isn't empty
-- for the seeded records. Attributed to nobody, dated to the row's creation.
insert into public.client_stage_history (client_id, from_stage, to_stage, changed_at)
select id, null, stage, created_at from public.clients;
