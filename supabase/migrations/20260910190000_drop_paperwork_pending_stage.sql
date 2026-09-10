-- "Paperwork Pending" is not a stage; paperwork is a condition that can be
-- outstanding at any stage, and the row already carries paperwork_complete for
-- that. Keeping both let them disagree. Remove the stage and make the flag the
-- single source of truth, then gate Active on it.

-- 1. Remap existing rows. Paperwork Pending sat after Booked in the funnel and
--    meant "booked, forms not back", so Booked + paperwork_complete = false is
--    the faithful translation. The stage-history trigger records this move.
update public.clients
   set stage = 'Booked',
       paperwork_complete = false
 where stage = 'Paperwork Pending';

-- 2. Replace the stage constraint without the removed value.
alter table public.clients drop constraint clients_stage_valid;
alter table public.clients add constraint clients_stage_valid check (stage in (
  'New Lead', 'Contacted', 'Verified', 'Booked', 'Active'
));

-- 3. Nobody becomes Active with paperwork outstanding. Enforced here so it
--    holds for every writer -- the profile form, the board, a script, the
--    dashboard -- not just the paths that remember to check.
alter table public.clients add constraint clients_active_requires_paperwork
  check (stage <> 'Active' or paperwork_complete);
