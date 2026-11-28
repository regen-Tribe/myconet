-- Join at once ("joinAtOnce" in a community's config; Sonia, 2026-11-28): joining the portal online is instant,
-- with no application and no steward. Three things live in the database so the screen is not the boundary:
--
--   1. show_to_members: "Show me to other members", the person's own choice. Off until they choose.
--   2. invited_by: who shared the invite link someone signed up from. Read from the link, never asked.
--   3. join_now(): an explorer becomes a joining member, only where the community turned joining at once on.
--
-- Nothing changes for a community that doesn't turn it on: its pages don't filter on show_to_members, and
-- join_now() refuses. Safe to run again.

-- ── 1. Show me to other members ─────────────────────────────────────────────────────────────────
-- Apart from `approved` (20261223000000): that one is an admin's, this one is the person's. Like `approved`
-- it is a listing switch (Members, search, counts), not a security boundary: calendars and pickers still
-- need the name. Everyone listed until now stays listed; people an admin added and hasn't approved start
-- hidden, and so does every account made from now on. Only when the column is new, so a second run never
-- undoes anyone's choice.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'user_profiles' and column_name = 'show_to_members') then
    alter table public.user_profiles add column show_to_members boolean not null default true;
    alter table public.user_profiles alter column show_to_members set default false;
    update public.user_profiles set show_to_members = false where approved is not true;
  end if;
end $$;

comment on column public.user_profiles.show_to_members is
  'The person''s own choice to be shown to other members (Members, search, counts). false until they say yes. Only they change it; not `approved`, which is an admin''s.';

-- ── 2. Who invited someone ──────────────────────────────────────────────────────────────────────
alter table public.user_profiles
  add column if not exists invited_by uuid references public.user_profiles(id) on delete set null;

comment on column public.user_profiles.invited_by is
  'Whose invite link this person signed up from (/join?invite=<username>). Set once at sign-up, never asked.';

-- Visitors' pages filter on show_to_members, so they must be allowed to read it (as with `approved`).
-- Signed-in people name their columns (20261226000000_newcomer_access.sql), so both are granted to them too.
grant select (show_to_members) on public.user_profiles to anon, authenticated;
grant select (invited_by) on public.user_profiles to authenticated;

-- Sign-up carries the inviter's username in the account's metadata (`invited_by`); the profile keeps who that
-- is. A name that matches nobody is ignored. The same metadata carries the last name typed at sign-up ("Ana
-- Reyes"), which handle_new_user() doesn't copy. Runs as the owner, because it reads auth.users.
create or replace function public.profile_from_sign_up()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_meta jsonb;
  v_name text;
begin
  select u.raw_user_meta_data into v_meta from auth.users u where u.id = new.id;
  v_name := lower(nullif(trim(v_meta->>'invited_by'), ''));
  if v_name is not null and new.invited_by is null then
    select p.id into new.invited_by from public.user_profiles p where lower(p.username) = v_name and p.id <> new.id limit 1;
  end if;
  if new.last_name is null then
    new.last_name := left(nullif(trim(v_meta->>'last_name'), ''), 80);
  end if;
  return new;
end $function$;
revoke execute on function public.profile_from_sign_up() from public, anon, authenticated;

drop trigger if exists trg_profile_from_sign_up on public.user_profiles;
create trigger trg_profile_from_sign_up before insert on public.user_profiles
  for each row execute function public.profile_from_sign_up();

-- Who may change them. show_to_members: only the person, not even an admin. invited_by: only an admin
-- (to correct it); the person can't rewrite who brought them in.
create or replace function public.guard_profile_own_choices()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.show_to_members is distinct from old.show_to_members and old.id is distinct from (select auth.uid()) then
    raise exception 'Only the person can choose to be shown to other members' using errcode = '42501';
  end if;
  if new.invited_by is distinct from old.invited_by and (select private.my_role()) is distinct from 'admin' then
    raise exception 'Only an admin can change who invited someone' using errcode = '42501';
  end if;
  return new;
end $function$;

drop trigger if exists trg_guard_profile_own_choices on public.user_profiles;
create trigger trg_guard_profile_own_choices before update on public.user_profiles
  for each row execute function public.guard_profile_own_choices();

-- ── 3. Joining at once ──────────────────────────────────────────────────────────────────────────
-- The community's switch, in the database too: without it any account could call join_now() and skip the
-- steward in a community that still reads applications. A community that sets "joinAtOnce": true in its
-- config turns this on in its own migration (instance/migrations).
alter table public.community_settings
  add column if not exists join_at_once boolean not null default false;

comment on column public.community_settings.join_at_once is
  'true = finishing the first onboarding makes an explorer a joining member at once (join_now()); false = a steward accepts applications.';

-- An explorer who finished the first onboarding becomes a joining member. People can't change their own
-- role (guard_profile_privileges), so this runs as the owner and moves only explorer → joining, only for
-- the caller. An application still waiting on a steward is answered by it.
-- (The approved update runs as the owner, so guard_profile_privileges lets it through.)
create or replace function public.join_now()
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if not coalesce((select s.join_at_once from public.community_settings s limit 1), false) then
    raise exception 'Joining at once is not turned on for this community' using errcode = '42501';
  end if;
  -- Someone an admin added (a guest who booked) and who has now claimed the account and finished the onboarding
  -- is no longer waiting for an admin: from here, being listed is their own choice (show_to_members)
  update public.user_profiles set approved = true where id = v_uid and approved is not true;
  select role into v_role from public.user_profiles where id = v_uid;
  if v_role is distinct from 'explorer' then
    return v_role;
  end if;
  update public.user_profiles set role = 'joining' where id = v_uid;
  update public.applications set status = 'accepted' where user_id = v_uid and status in ('pending', 'reviewing');
  return 'joining';
end $function$;
revoke execute on function public.join_now() from public, anon;
grant execute on function public.join_now() to authenticated;
