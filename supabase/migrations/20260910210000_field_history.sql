-- Field-level change history: for every edit to a client record, one row per
-- field that actually changed, with the previous value, the new value, when,
-- and who. The stage-history trigger covers stage; this covers everything else.
--
-- Same shape as stage history: written only by a trigger, staff can read but
-- not write, attribution comes from auth.uid() because staff writes run as the
-- user rather than the service key.

create table public.client_field_history (
  id               bigint generated always as identity primary key,
  client_id        uuid not null references public.clients(id) on delete cascade,
  field            text not null,
  old_value        text,
  new_value        text,
  changed_at       timestamptz not null default now(),
  changed_by       uuid references auth.users(id) on delete set null,
  changed_by_email text
);

create index client_field_history_client_idx
  on public.client_field_history (client_id, changed_at desc);

create or replace function public.record_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
  k text;
begin
  for k in select jsonb_object_keys(n) loop
    -- bookkeeping columns, the immutable import snapshot, and stage (which has
    -- its own history) are not user edits
    if k in ('id', 'created_at', 'updated_at', 'raw_import', 'source', 'stage') then
      continue;
    end if;
    if (o -> k) is distinct from (n -> k) then
      insert into public.client_field_history
        (client_id, field, old_value, new_value, changed_by, changed_by_email)
      values
        (new.id, k, o ->> k, n ->> k, auth.uid(), auth.jwt() ->> 'email');
    end if;
  end loop;
  return new;
end;
$$;

create trigger clients_record_field_changes
  after update on public.clients
  for each row execute function public.record_field_changes();

grant select on public.client_field_history to authenticated;
grant all    on public.client_field_history to service_role;

alter table public.client_field_history enable row level security;

create policy "staff can read field history"
  on public.client_field_history for select
  to authenticated
  using (true);
