-- Security hardening (audit 2026-11-02).
-- Adds guards rather than replacing policies: RESTRICTIVE policies AND with the
-- existing permissive ones, so they only ever narrow access.

-- 1. Profiles: nobody but an admin (or trusted server code) changes role / lead_circles.
--    "Profiles: update own" had no column limits, so any user could make themselves admin.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Trusted contexts (security definer functions, SQL editor, service role) run as a non-API role
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if (select private.my_role()) = 'admin' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'explorer';
    new.lead_circles := '{}';
    return new;
  end if;
  if new.role is distinct from old.role or new.lead_circles is distinct from old.lead_circles then
    raise exception 'Only an admin can change roles or circle leadership' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger guard_profile_privileges before insert or update on public.user_profiles
  for each row execute function public.guard_profile_privileges();

-- Joining → member promotion moves server-side (was a client-side role update).
-- Qualifies with an accepted/active/completed agreement, or a project they created
-- that has been accepted onto the board.
create or replace function public.promote_to_member_if_eligible()
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
begin
  select role into v_role from public.user_profiles where id = v_uid;
  if v_role is distinct from 'joining' then
    return v_role;
  end if;
  if exists (select 1 from public.collaboration_agreements
             where user_id = v_uid and status in ('accepted', 'active', 'completed'))
     or exists (select 1 from public.projects
                where created_by = v_uid and status in ('backlog', 'in_progress', 'review', 'done')) then
    update public.user_profiles set role = 'member' where id = v_uid;
    insert into public.user_achievements (user_id, achievement_key)
      values (v_uid, 'community_member') on conflict do nothing;
    return 'member';
  end if;
  return v_role;
end $$;

revoke execute on function public.promote_to_member_if_eligible() from public, anon;
grant execute on function public.promote_to_member_if_eligible() to authenticated;

-- 2. Deliverables: "del_write_auth" let any signed-in user edit or delete any deliverable.
--    Mirror the app: ops leads (admin, circle_lead, project_lead) or the project's creator/lead.
create or replace function private.can_manage_project(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select (select private.my_role()) in ('admin', 'circle_lead', 'project_lead')
      or exists (select 1 from public.projects p
                 where p.id = p_project_id
                   and (select auth.uid()) in (p.created_by, p.lead_user_id))
$$;
grant execute on function private.can_manage_project(uuid) to authenticated;

create policy "deliverables writes need a project manager" on public.deliverables
  as restrictive for insert with check (private.can_manage_project(project_id));
create policy "deliverables edits need a project manager" on public.deliverables
  as restrictive for update using (private.can_manage_project(project_id)) with check (private.can_manage_project(project_id));
create policy "deliverables deletes need a project manager" on public.deliverables
  as restrictive for delete using (private.can_manage_project(project_id));

-- 3. Governance: proposals from full members only; each vote layer limited to its voters.
create policy "proposals come from full members" on public.proposals
  as restrictive for insert
  with check ((select private.my_role()) in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin'));

create policy "votes follow layer eligibility" on public.proposal_votes
  as restrictive for insert
  with check (
    (layer = 'sociocracy' and (select private.my_role()) = 'circle_lead')
    or (layer = 'democracy' and (select private.my_role()) in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin'))
    or (layer = 'merit' and (select private.my_role()) in ('advisor', 'admin'))
  );
create policy "vote changes follow layer eligibility" on public.proposal_votes
  as restrictive for update
  with check (
    (layer = 'sociocracy' and (select private.my_role()) = 'circle_lead')
    or (layer = 'democracy' and (select private.my_role()) in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin'))
    or (layer = 'merit' and (select private.my_role()) in ('advisor', 'admin'))
  );

-- 4. Applications: applicants can edit or resubmit, but only admins set a decision.
create policy "only admins decide applications" on public.applications
  as restrictive for update
  with check ((select private.my_role()) = 'admin' or status = 'pending');

-- 5. Achievements: self-awarded badges only when the condition holds.
create policy "achievements must be earned" on public.user_achievements
  as restrictive for insert
  with check (
    (select private.my_role()) = 'admin'
    or achievement_key = 'profile_complete'
    or (achievement_key = 'community_joiner' and (select private.my_role()) in ('joining', 'member', 'circle_lead', 'project_lead', 'advisor', 'admin'))
    or (achievement_key = 'community_member' and (select private.my_role()) in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin'))
  );
