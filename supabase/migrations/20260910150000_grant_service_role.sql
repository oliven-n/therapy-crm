-- service_role needs table privileges too.
--
-- Bypassing RLS is not the same as bypassing GRANT. service_role skips policy
-- evaluation, but it is still an ordinary Postgres role and still subject to
-- table privileges. With "automatically expose new tables" off, nothing granted
-- it access, so every server-side caller -- the seed script and the intake
-- form's server action -- was refused with 42501 before RLS was ever reached.

grant usage on schema public to service_role;
grant all on public.clients to service_role;
