-- M14: a third calendar, "Tasks" — things the community needs done, posted by
-- full members and leads (same rule as core events). People sign up via RSVP.
-- The existing update policy's WITH CHECK already limits non-members to 'community'.

alter table public.events
  drop constraint events_kind_check,
  add constraint events_kind_check check (kind in ('core', 'community', 'task'));

-- Added alongside "members can create events" (policies are OR'd)
create policy "members can create tasks" on public.events for insert
  with check (
    created_by = (select auth.uid())
    and kind = 'task'
    and (select private.my_role()) in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin')
  );
