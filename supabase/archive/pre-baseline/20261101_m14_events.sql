-- M14 Events: community calendar
-- Two kinds of event:
--   community — "community hosted", any joining member or above can post
--   core      — official community events, full members / leads / admins only
-- An event can be public (visible to logged-out visitors) and can link to a
-- circle, an Ops project and/or a Governance proposal.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- Role of the signed-in user (null when logged out). SECURITY DEFINER so policies
-- can read it without recursing through user_profiles RLS.
create or replace function private.my_role()
returns text
language sql stable security definer set search_path = ''
as $$ select role from public.user_profiles where id = (select auth.uid()) $$;

create or replace function private.my_lead_circles()
returns text[]
language sql stable security definer set search_path = ''
as $$ select coalesce(lead_circles, '{}') from public.user_profiles where id = (select auth.uid()) $$;

grant execute on function private.my_role(), private.my_lead_circles() to anon, authenticated;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  location text,
  online_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  kind text not null default 'community' check (kind in ('core', 'community')),
  is_public boolean not null default false,
  circle text check (circle in ('ecology', 'hardware', 'humanware', 'economy', 'tech')),
  project_id uuid references public.projects(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  created_by uuid not null default auth.uid() references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index events_starts_at_idx on public.events (starts_at);
create index events_project_id_idx on public.events (project_id) where project_id is not null;
create index events_proposal_id_idx on public.events (proposal_id) where proposal_id is not null;
create index events_created_by_idx on public.events (created_by);

create table public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.user_profiles(id) on delete cascade,
  status text not null check (status in ('going', 'maybe')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_rsvps_user_id_idx on public.event_rsvps (user_id);

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

-- Read: public events for everyone; everything for joining members and above
create policy "events are readable" on public.events for select
  using (
    is_public
    or (select private.my_role()) in ('joining', 'member', 'circle_lead', 'project_lead', 'advisor', 'admin')
  );

-- Create: community events need joining+, core events need a full member role
create policy "members can create events" on public.events for insert
  with check (
    created_by = (select auth.uid())
    and (
      (kind = 'community' and (select private.my_role()) in ('joining', 'member', 'circle_lead', 'project_lead', 'advisor', 'admin'))
      or (kind = 'core' and (select private.my_role()) in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin'))
    )
  );

-- Edit/delete: the creator, an admin, or a circle lead for the event's circle.
-- WITH CHECK re-applies the kind rule so a joining member can't promote to core.
create policy "owners and leads can update events" on public.events for update
  using (
    created_by = (select auth.uid())
    or (select private.my_role()) = 'admin'
    or ((select private.my_role()) = 'circle_lead' and circle = any (private.my_lead_circles()))
  )
  with check (
    (
      created_by = (select auth.uid())
      or (select private.my_role()) = 'admin'
      or ((select private.my_role()) = 'circle_lead' and circle = any (private.my_lead_circles()))
    )
    and (kind = 'community' or (select private.my_role()) in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin'))
  );

create policy "owners and leads can delete events" on public.events for delete
  using (
    created_by = (select auth.uid())
    or (select private.my_role()) = 'admin'
    or ((select private.my_role()) = 'circle_lead' and circle = any (private.my_lead_circles()))
  );

-- RSVPs: signed-in users see RSVPs for events they can see (never logged-out visitors)
create policy "signed-in users read rsvps" on public.event_rsvps for select
  using ((select auth.uid()) is not null and exists (select 1 from public.events e where e.id = event_id));

create policy "users rsvp for themselves" on public.event_rsvps for insert
  with check (user_id = (select auth.uid()) and exists (select 1 from public.events e where e.id = event_id));

create policy "users change their rsvp" on public.event_rsvps for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "users remove their rsvp" on public.event_rsvps for delete
  using (user_id = (select auth.uid()));

create or replace function public.touch_events_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger events_touch_updated_at before update on public.events
  for each row execute function public.touch_events_updated_at();
