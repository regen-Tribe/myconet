-- MyCoNet core — baseline schema
--
-- The whole database structure as of RTRN portal v3.69 (2026-11-03), in one file:
-- tables, constraints, functions, indexes, triggers, row-level security, storage.
-- Structure only: no member data, no community content. Each community seeds its
-- own content (circles, Blueprint, first admin) separately.
--
-- A NEW community database runs this file, then any later migrations.
-- RTRN's database already has all of this: mark it as applied there
-- (`supabase migration repair --status applied <version>`), don't run it.
--
-- Generated from the live catalog (pg_get_*def). Supersedes the five
-- November migrations, kept in RTRN's repo (instance/supabase-archive/).

set check_function_bodies = false;
set search_path = public, extensions;

-- ── Extensions & schemas ────────────────────────────────────────────────

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;   -- bookings_no_overlap

-- Security-definer helpers for RLS live here, outside the API-exposed schema.
create schema if not exists private;
grant usage on schema private to anon, authenticated;
-- ── Tables ──────────────────────────────────────────────────────────────

create table public.applications (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  answers jsonb default '{}'::jsonb not null,
  status text default 'pending'::text not null,
  admin_notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.blueprints (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  answers jsonb default '{}'::jsonb not null,
  flags jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  is_community boolean default false not null
);

create table public.booking_items (
  id uuid default gen_random_uuid() not null,
  name text not null,
  description text,
  category text not null,
  tags text[] default '{}'::text[] not null,
  circle text,
  location text,
  capacity integer,
  requires_approval boolean default false not null,
  is_active boolean default true not null,
  created_by uuid default auth.uid(),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.bookings (
  id uuid default gen_random_uuid() not null,
  item_id uuid not null,
  user_id uuid default auth.uid() not null,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  status text default 'pending'::text not null,
  note text,
  decided_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.collaboration_agreements (
  id uuid default gen_random_uuid() not null,
  project_id uuid not null,
  user_id uuid not null,
  work_description text not null,
  expected_reward text not null,
  status text default 'pending'::text not null,
  admin_notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  conditions text,
  points_value integer default 0
);

create table public.communities (
  id uuid default uuid_generate_v4() not null,
  slug text not null,
  name text not null,
  tagline text,
  description text,
  location text,
  phase text default 'spark'::text,
  visibility text default 'public'::text,
  cover_image_url text,
  wizard_values jsonb,
  flagged_fields jsonb,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.community_members (
  community_id uuid not null,
  user_id uuid not null,
  role text not null,
  status text default 'active'::text,
  joined_at timestamp with time zone default now()
);

create table public.community_values (
  id uuid default gen_random_uuid() not null,
  title text not null,
  description text,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now()
);

create table public.deliverable_subscriptions (
  id uuid default gen_random_uuid() not null,
  deliverable_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now()
);

create table public.deliverables (
  id uuid default gen_random_uuid() not null,
  project_id uuid not null,
  title text not null,
  assignee_id uuid,
  due_date date,
  status text default 'backlog'::text not null,
  progress numeric(4,3) default 0 not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  from_agreement_id uuid
);

create table public.event_rsvps (
  event_id uuid not null,
  user_id uuid default auth.uid() not null,
  status text not null,
  created_at timestamp with time zone default now() not null
);

create table public.events (
  id uuid default gen_random_uuid() not null,
  title text not null,
  description text,
  location text,
  online_url text,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone,
  all_day boolean default false not null,
  kind text default 'community'::text not null,
  is_public boolean default false not null,
  circle text,
  project_id uuid,
  proposal_id uuid,
  created_by uuid default auth.uid() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.org_unit_members (
  unit_id uuid not null,
  user_id uuid not null,
  role text default 'member'::text not null,
  title text,
  created_at timestamp with time zone default now() not null
);

create table public.org_units (
  id uuid default gen_random_uuid() not null,
  kind text not null,
  circle text not null,
  name text not null,
  description text,
  sort_order integer default 0 not null,
  created_by uuid default auth.uid(),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.project_subscriptions (
  id uuid default gen_random_uuid() not null,
  project_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now()
);

create table public.project_updates (
  id uuid default gen_random_uuid() not null,
  project_id uuid not null,
  user_id uuid not null,
  content text not null,
  created_at timestamp with time zone default now() not null
);

create table public.projects (
  id uuid default gen_random_uuid() not null,
  title text not null,
  description text,
  status text default 'active'::text not null,
  open_for_collaborators boolean default true not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  needs text[] default '{}'::text[],
  deadline date,
  sprint_name text,
  lead_user_id uuid,
  circle text
);

create table public.proposal_comments (
  id uuid default gen_random_uuid() not null,
  proposal_id uuid not null,
  user_id uuid not null,
  content text not null,
  created_at timestamp with time zone default now() not null
);

create table public.proposal_votes (
  id uuid default gen_random_uuid() not null,
  proposal_id uuid not null,
  user_id uuid not null,
  vote text not null,
  note text,
  created_at timestamp with time zone default now() not null,
  layer text default 'sociocracy'::text not null
);

create table public.proposals (
  id uuid default gen_random_uuid() not null,
  title text not null,
  description text,
  proposer_id uuid not null,
  decision_mode text default 'consent'::text not null,
  status text default 'open'::text not null,
  closes_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table public.user_achievements (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  achievement_key text not null,
  earned_at timestamp with time zone default now() not null
);

create table public.user_bio (
  user_id uuid not null,
  values_principles text,
  personality_details jsonb default '{}'::jsonb,
  archetypes jsonb default '{}'::jsonb,
  goals text,
  fears text,
  traumas text,
  what_creating text,
  skills text[] default '{}'::text[],
  interests text[] default '{}'::text[],
  places_traveling jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default now()
);

create table public.user_community_prefs (
  user_id uuid not null,
  governance_style text[],
  economic_model text[],
  lifestyle text[],
  ecology_priority text[],
  geography_preference text[],
  size_preference text,
  phase_interest text[],
  prefs_raw jsonb,
  updated_at timestamp with time zone default now()
);

create table public.user_connections (
  id uuid default uuid_generate_v4() not null,
  from_user_id uuid not null,
  to_user_id uuid not null,
  status text default 'pending'::text,
  intro_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.user_offers (
  id uuid default uuid_generate_v4() not null,
  user_id uuid not null,
  category text not null,
  title text not null,
  description text,
  created_at timestamp with time zone default now(),
  compensation_model text default 'Other'::text,
  price text,
  is_active boolean default true
);

create table public.user_profiles (
  id uuid not null,
  username text not null,
  avatar_url text,
  created_at timestamp with time zone default now(),
  user_types text[] default '{}'::text[],
  first_name text,
  last_name text,
  headline text,
  country text,
  city text,
  updated_at timestamp with time zone default now(),
  role text default 'explorer'::text not null,
  lead_circles text[] default '{}'::text[] not null
);

create table public.user_requests (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  request_text text default ''::text not null,
  category text,
  urgency text default 'normal'::text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table public.value_signatures (
  user_id uuid not null,
  value_id uuid not null,
  signed_at timestamp with time zone default now()
);

-- ── Constraints ─────────────────────────────────────────────────────────

alter table only public.applications add constraint applications_pkey PRIMARY KEY (id);
alter table only public.blueprints add constraint blueprints_pkey PRIMARY KEY (id);
alter table only public.booking_items add constraint booking_items_pkey PRIMARY KEY (id);
alter table only public.bookings add constraint bookings_pkey PRIMARY KEY (id);
alter table only public.collaboration_agreements add constraint collaboration_agreements_pkey PRIMARY KEY (id);
alter table only public.communities add constraint communities_pkey PRIMARY KEY (id);
alter table only public.community_members add constraint community_members_pkey PRIMARY KEY (community_id, user_id);
alter table only public.community_values add constraint community_values_pkey PRIMARY KEY (id);
alter table only public.deliverable_subscriptions add constraint deliverable_subscriptions_pkey PRIMARY KEY (id);
alter table only public.deliverables add constraint deliverables_pkey PRIMARY KEY (id);
alter table only public.event_rsvps add constraint event_rsvps_pkey PRIMARY KEY (event_id, user_id);
alter table only public.events add constraint events_pkey PRIMARY KEY (id);
alter table only public.org_unit_members add constraint org_unit_members_pkey PRIMARY KEY (unit_id, user_id);
alter table only public.org_units add constraint org_units_pkey PRIMARY KEY (id);
alter table only public.project_subscriptions add constraint project_subscriptions_pkey PRIMARY KEY (id);
alter table only public.project_updates add constraint project_updates_pkey PRIMARY KEY (id);
alter table only public.projects add constraint projects_pkey PRIMARY KEY (id);
alter table only public.proposal_comments add constraint proposal_comments_pkey PRIMARY KEY (id);
alter table only public.proposal_votes add constraint proposal_votes_pkey PRIMARY KEY (id);
alter table only public.proposals add constraint proposals_pkey PRIMARY KEY (id);
alter table only public.user_achievements add constraint user_achievements_pkey PRIMARY KEY (id);
alter table only public.user_bio add constraint user_bio_pkey PRIMARY KEY (user_id);
alter table only public.user_community_prefs add constraint user_community_prefs_pkey PRIMARY KEY (user_id);
alter table only public.user_connections add constraint user_connections_pkey PRIMARY KEY (id);
alter table only public.user_offers add constraint user_offers_pkey PRIMARY KEY (id);
alter table only public.user_profiles add constraint user_profiles_pkey PRIMARY KEY (id);
alter table only public.user_requests add constraint user_requests_pkey PRIMARY KEY (id);
alter table only public.value_signatures add constraint value_signatures_pkey PRIMARY KEY (user_id, value_id);
alter table only public.applications add constraint applications_user_id_key UNIQUE (user_id);
alter table only public.blueprints add constraint blueprints_user_id_key UNIQUE (user_id);
alter table only public.collaboration_agreements add constraint collaboration_agreements_project_id_user_id_key UNIQUE (project_id, user_id);
alter table only public.communities add constraint communities_slug_key UNIQUE (slug);
alter table only public.deliverable_subscriptions add constraint deliverable_subscriptions_deliverable_id_user_id_key UNIQUE (deliverable_id, user_id);
alter table only public.project_subscriptions add constraint project_subscriptions_project_id_user_id_key UNIQUE (project_id, user_id);
alter table only public.proposal_votes add constraint proposal_votes_proposal_id_user_id_layer_key UNIQUE (proposal_id, user_id, layer);
alter table only public.user_achievements add constraint user_achievements_user_id_achievement_key_key UNIQUE (user_id, achievement_key);
alter table only public.user_connections add constraint user_connections_from_user_id_to_user_id_key UNIQUE (from_user_id, to_user_id);
alter table only public.user_profiles add constraint user_profiles_username_key UNIQUE (username);
alter table only public.bookings add constraint bookings_no_overlap EXCLUDE USING gist (item_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE ((status = ANY (ARRAY['pending'::text, 'confirmed'::text])));
alter table only public.applications add constraint applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'accepted'::text, 'rejected'::text])));
alter table only public.booking_items add constraint booking_items_capacity_check CHECK (((capacity IS NULL) OR (capacity > 0)));
alter table only public.booking_items add constraint booking_items_category_check CHECK ((category = ANY (ARRAY['accommodation'::text, 'tools'::text, 'spaces'::text])));
alter table only public.booking_items add constraint booking_items_circle_check CHECK ((circle = ANY (ARRAY['ecology'::text, 'hardware'::text, 'humanware'::text, 'economy'::text, 'tech'::text])));
alter table only public.booking_items add constraint booking_items_name_check CHECK ((length(TRIM(BOTH FROM name)) > 0));
alter table only public.bookings add constraint bookings_check CHECK ((ends_at > starts_at));
alter table only public.bookings add constraint bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'declined'::text, 'cancelled'::text])));
alter table only public.collaboration_agreements add constraint collaboration_agreements_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'active'::text, 'completed'::text])));
alter table only public.communities add constraint communities_phase_check CHECK ((phase = ANY (ARRAY['spark'::text, 'prove'::text, 'build'::text, 'live'::text])));
alter table only public.communities add constraint communities_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'unlisted'::text, 'private'::text])));
alter table only public.community_members add constraint community_members_role_check CHECK ((role = ANY (ARRAY['co_creator'::text, 'resident'::text, 'guest'::text, 'follower'::text])));
alter table only public.community_members add constraint community_members_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'inactive'::text])));
alter table only public.deliverables add constraint deliverables_progress_check CHECK (((progress >= (0)::numeric) AND (progress <= (1)::numeric)));
alter table only public.deliverables add constraint deliverables_status_check CHECK ((status = ANY (ARRAY['backlog'::text, 'in_progress'::text, 'review'::text, 'done'::text])));
alter table only public.event_rsvps add constraint event_rsvps_status_check CHECK ((status = ANY (ARRAY['going'::text, 'maybe'::text])));
alter table only public.events add constraint events_check CHECK (((ends_at IS NULL) OR (ends_at >= starts_at)));
alter table only public.events add constraint events_circle_check CHECK ((circle = ANY (ARRAY['ecology'::text, 'hardware'::text, 'humanware'::text, 'economy'::text, 'tech'::text])));
alter table only public.events add constraint events_kind_check CHECK ((kind = ANY (ARRAY['core'::text, 'community'::text, 'task'::text])));
alter table only public.events add constraint events_title_check CHECK ((length(TRIM(BOTH FROM title)) > 0));
alter table only public.org_unit_members add constraint org_unit_members_role_check CHECK ((role = ANY (ARRAY['lead'::text, 'member'::text])));
alter table only public.org_unit_members add constraint org_unit_members_title_check CHECK (((title IS NULL) OR (length(title) <= 60)));
alter table only public.org_units add constraint org_units_circle_check CHECK ((circle = ANY (ARRAY['ecology'::text, 'hardware'::text, 'humanware'::text, 'economy'::text, 'tech'::text])));
alter table only public.org_units add constraint org_units_kind_check CHECK ((kind = ANY (ARRAY['circle'::text, 'team'::text])));
alter table only public.org_units add constraint org_units_name_check CHECK ((length(TRIM(BOTH FROM name)) > 0));
alter table only public.projects add constraint projects_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'backlog'::text, 'in_progress'::text, 'review'::text, 'done'::text, 'paused'::text])));
alter table only public.proposal_votes add constraint proposal_votes_vote_check CHECK ((vote = ANY (ARRAY['consent'::text, 'concern'::text, 'object'::text, 'yes'::text, 'no'::text, 'approve'::text, 'reject'::text])));
alter table only public.proposals add constraint proposals_decision_mode_check CHECK ((decision_mode = ANY (ARRAY['consent'::text, 'democracy'::text, 'meritocracy'::text, 'ai'::text])));
alter table only public.proposals add constraint proposals_status_check CHECK ((status = ANY (ARRAY['open'::text, 'passed'::text, 'rejected'::text, 'withdrawn'::text])));
alter table only public.user_connections add constraint user_connections_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'connected'::text, 'declined'::text, 'blocked'::text])));
alter table only public.user_profiles add constraint user_profiles_role_check CHECK ((role = ANY (ARRAY['explorer'::text, 'joining'::text, 'member'::text, 'circle_lead'::text, 'project_lead'::text, 'admin'::text])));
alter table only public.applications add constraint applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.blueprints add constraint blueprints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.booking_items add constraint booking_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
alter table only public.bookings add constraint bookings_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
alter table only public.bookings add constraint bookings_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.booking_items(id) ON DELETE CASCADE;
alter table only public.bookings add constraint bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.collaboration_agreements add constraint collaboration_agreements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
alter table only public.collaboration_agreements add constraint collaboration_agreements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.communities add constraint communities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);
alter table only public.community_members add constraint community_members_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;
alter table only public.community_members add constraint community_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.deliverable_subscriptions add constraint deliverable_subscriptions_deliverable_id_fkey FOREIGN KEY (deliverable_id) REFERENCES public.deliverables(id) ON DELETE CASCADE;
alter table only public.deliverable_subscriptions add constraint deliverable_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.deliverables add constraint deliverables_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
alter table only public.deliverables add constraint deliverables_from_agreement_id_fkey FOREIGN KEY (from_agreement_id) REFERENCES public.collaboration_agreements(id) ON DELETE SET NULL;
alter table only public.deliverables add constraint deliverables_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
alter table only public.event_rsvps add constraint event_rsvps_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
alter table only public.event_rsvps add constraint event_rsvps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.events add constraint events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.events add constraint events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
alter table only public.events add constraint events_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;
alter table only public.org_unit_members add constraint org_unit_members_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.org_units(id) ON DELETE CASCADE;
alter table only public.org_unit_members add constraint org_unit_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.org_units add constraint org_units_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
alter table only public.project_subscriptions add constraint project_subscriptions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
alter table only public.project_subscriptions add constraint project_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.project_updates add constraint project_updates_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
alter table only public.project_updates add constraint project_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.projects add constraint projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
alter table only public.projects add constraint projects_lead_user_id_fkey FOREIGN KEY (lead_user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
alter table only public.proposal_comments add constraint proposal_comments_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;
alter table only public.proposal_comments add constraint proposal_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.proposal_votes add constraint proposal_votes_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;
alter table only public.proposal_votes add constraint proposal_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.proposals add constraint proposals_proposer_id_fkey FOREIGN KEY (proposer_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.user_achievements add constraint user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.user_bio add constraint user_bio_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.user_community_prefs add constraint user_community_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.user_connections add constraint user_connections_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.user_connections add constraint user_connections_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.user_offers add constraint user_offers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.user_profiles add constraint user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.user_requests add constraint user_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.value_signatures add constraint value_signatures_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
alter table only public.value_signatures add constraint value_signatures_value_id_fkey FOREIGN KEY (value_id) REFERENCES public.community_values(id) ON DELETE CASCADE;

-- ── Functions ───────────────────────────────────────────────────────────
-- private.* are security-definer helpers used by RLS policies; they live
-- outside the API-exposed schema so they can't be called over RPC.

CREATE OR REPLACE FUNCTION private.can_edit_org_unit(p_unit_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.org_units u
    where u.id = p_unit_id
      and (
        private.can_lead_circle(u.circle)
        or (u.kind = 'team' and exists (
              select 1 from public.org_unit_members m
              where m.unit_id = u.id and m.user_id = (select auth.uid()) and m.role = 'lead'))
      )
  )
$function$
;

CREATE OR REPLACE FUNCTION private.can_lead_circle(p_circle text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select private.my_role()) = 'admin'
      or ((select private.my_role()) = 'circle_lead' and p_circle = any (private.my_lead_circles()))
$function$
;

CREATE OR REPLACE FUNCTION private.can_manage_item(p_item_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.user_profiles up
    left join public.booking_items i on i.id = p_item_id
    where up.id = (select auth.uid())
      and (
        up.role = 'admin'
        or (up.role = 'circle_lead' and (i.circle is null or i.circle = any (up.lead_circles) or i.created_by = up.id))
      )
  )
$function$
;

CREATE OR REPLACE FUNCTION private.can_manage_project(p_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select private.my_role()) in ('admin', 'circle_lead', 'project_lead')
      or exists (select 1 from public.projects p
                 where p.id = p_project_id
                   and (select auth.uid()) in (p.created_by, p.lead_user_id))
$function$
;

CREATE OR REPLACE FUNCTION private.my_lead_circles()
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select coalesce(lead_circles, '{}') from public.user_profiles where id = (select auth.uid()) $function$
;

CREATE OR REPLACE FUNCTION private.my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select role from public.user_profiles where id = (select auth.uid()) $function$
;

CREATE OR REPLACE FUNCTION public.bookings_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_item public.booking_items;
begin
  select * into v_item from public.booking_items where id = new.item_id;
  if tg_op = 'INSERT' then
    if v_item.id is null or not v_item.is_active then
      raise exception 'This item is not available to book';
    end if;
    new.status := case when v_item.requires_approval then 'pending' else 'confirmed' end;
    new.decided_by := null;
    return new;
  end if;

  new.updated_at := now();
  if private.can_manage_item(new.item_id) then
    if new.status is distinct from old.status and new.status in ('confirmed', 'declined') then
      new.decided_by := (select auth.uid());
    end if;
    return new;
  end if;

  if new.status <> 'cancelled'
     or new.item_id <> old.item_id or new.user_id <> old.user_id
     or new.starts_at <> old.starts_at or new.ends_at <> old.ends_at
     or new.decided_by is distinct from old.decided_by then
    raise exception 'You can only cancel your own booking';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
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
end $function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  base_username TEXT;
  candidate TEXT;
  counter INT := 2;
BEGIN
  base_username := regexp_replace(
    lower(coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1))),
    '[^a-z0-9]', '', 'g'
  );

  IF base_username = '' THEN base_username := 'user'; END IF;

  candidate := base_username;

  WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = candidate) LOOP
    candidate := base_username || counter;
    counter := counter + 1;
  END LOOP;

  INSERT INTO public.user_profiles (id, username, first_name)
  VALUES (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1))
  );

  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'circle_lead', 'project_lead')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.promote_to_member_if_eligible()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_events_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin new.updated_at = now(); return new; end $function$
;

CREATE OR REPLACE FUNCTION public.trg_applications_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_collab_agreements_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_projects_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end;
$function$
;

-- ── Indexes (other than those backing constraints) ─────────────────────

CREATE UNIQUE INDEX blueprints_one_community ON public.blueprints USING btree (is_community) WHERE (is_community = true);
CREATE INDEX booking_items_category_idx ON public.booking_items USING btree (category) WHERE is_active;
CREATE INDEX booking_items_created_by_idx ON public.booking_items USING btree (created_by);
CREATE INDEX bookings_decided_by_idx ON public.bookings USING btree (decided_by) WHERE (decided_by IS NOT NULL);
CREATE INDEX bookings_item_starts_idx ON public.bookings USING btree (item_id, starts_at);
CREATE INDEX bookings_user_id_idx ON public.bookings USING btree (user_id);
CREATE INDEX event_rsvps_user_id_idx ON public.event_rsvps USING btree (user_id);
CREATE INDEX events_created_by_idx ON public.events USING btree (created_by);
CREATE INDEX events_project_id_idx ON public.events USING btree (project_id) WHERE (project_id IS NOT NULL);
CREATE INDEX events_proposal_id_idx ON public.events USING btree (proposal_id) WHERE (proposal_id IS NOT NULL);
CREATE INDEX events_starts_at_idx ON public.events USING btree (starts_at);
CREATE INDEX idx_deliverables_from_agreement_id ON public.deliverables USING btree (from_agreement_id) WHERE (from_agreement_id IS NOT NULL);
CREATE INDEX idx_projects_circle ON public.projects USING btree (circle) WHERE (circle IS NOT NULL);
CREATE INDEX org_unit_members_user_idx ON public.org_unit_members USING btree (user_id);
CREATE INDEX org_units_circle_idx ON public.org_units USING btree (circle, sort_order);
CREATE INDEX org_units_created_by_idx ON public.org_units USING btree (created_by);
CREATE UNIQUE INDEX org_units_one_per_circle ON public.org_units USING btree (circle) WHERE (kind = 'circle'::text);

-- ── Triggers ────────────────────────────────────────────────────────────

CREATE TRIGGER set_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.trg_applications_updated_at();
CREATE TRIGGER booking_items_touch_updated_at BEFORE UPDATE ON public.booking_items FOR EACH ROW EXECUTE FUNCTION public.touch_events_updated_at();
CREATE TRIGGER bookings_guard BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.bookings_guard();
CREATE TRIGGER set_collab_agreements_updated_at BEFORE UPDATE ON public.collaboration_agreements FOR EACH ROW EXECUTE FUNCTION public.trg_collab_agreements_updated_at();
CREATE TRIGGER trg_communities_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER events_touch_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_events_updated_at();
CREATE TRIGGER org_units_touch_updated_at BEFORE UPDATE ON public.org_units FOR EACH ROW EXECUTE FUNCTION public.touch_events_updated_at();
CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.trg_projects_updated_at();
CREATE TRIGGER trg_user_bio_updated_at BEFORE UPDATE ON public.user_bio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_community_prefs_updated_at BEFORE UPDATE ON public.user_community_prefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_connections_updated_at BEFORE UPDATE ON public.user_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER guard_profile_privileges BEFORE INSERT OR UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- New sign-ups get a profile row
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Row-level security: on for every table ─────────────────────────────

alter table public.applications enable row level security;
alter table public.blueprints enable row level security;
alter table public.booking_items enable row level security;
alter table public.bookings enable row level security;
alter table public.collaboration_agreements enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_values enable row level security;
alter table public.deliverable_subscriptions enable row level security;
alter table public.deliverables enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.events enable row level security;
alter table public.org_unit_members enable row level security;
alter table public.org_units enable row level security;
alter table public.project_subscriptions enable row level security;
alter table public.project_updates enable row level security;
alter table public.projects enable row level security;
alter table public.proposal_comments enable row level security;
alter table public.proposal_votes enable row level security;
alter table public.proposals enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_bio enable row level security;
alter table public.user_community_prefs enable row level security;
alter table public.user_connections enable row level security;
alter table public.user_offers enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_requests enable row level security;
alter table public.value_signatures enable row level security;

-- ── Row-level security policies ─────────────────────────────────────────
-- "as restrictive" policies AND with the permissive ones: they narrow access.

create policy "admins can read all applications" on public.applications as permissive for select to public
  using (is_admin());

create policy "admins can update any application" on public.applications as permissive for update to public
  using (is_admin());

create policy "only admins decide applications" on public.applications as restrictive for update to public
  with check (((( SELECT private.my_role() AS my_role) = 'admin'::text) OR (status = 'pending'::text)));

create policy "users can read own application" on public.applications as permissive for select to public
  using ((auth.uid() = user_id));

create policy "users can reapply after rejection" on public.applications as permissive for update to public
  using (((auth.uid() = user_id) AND (status = 'rejected'::text)))
  with check ((auth.uid() = user_id));

create policy "users can submit application" on public.applications as permissive for insert to public
  with check ((auth.uid() = user_id));

create policy "users can update pending application" on public.applications as permissive for update to public
  using (((auth.uid() = user_id) AND (status = 'pending'::text)));

create policy "Anyone can view blueprints" on public.blueprints as permissive for select to public
  using (true);

create policy "Users can insert own blueprint" on public.blueprints as permissive for insert to public
  with check ((auth.uid() = user_id));

create policy "Users can update own blueprint" on public.blueprints as permissive for update to public
  using ((auth.uid() = user_id));

create policy "anyone can browse active items" on public.booking_items as permissive for select to public
  using ((is_active OR (( SELECT private.my_role() AS my_role) = ANY (ARRAY['admin'::text, 'circle_lead'::text]))));

create policy "leads add items" on public.booking_items as permissive for insert to public
  with check (((created_by = ( SELECT auth.uid() AS uid)) AND ((( SELECT private.my_role() AS my_role) = 'admin'::text) OR ((( SELECT private.my_role() AS my_role) = 'circle_lead'::text) AND ((circle IS NULL) OR (circle = ANY (private.my_lead_circles())))))));

create policy "leads delete items" on public.booking_items as permissive for delete to public
  using (private.can_manage_item(id));

create policy "leads edit items" on public.booking_items as permissive for update to public
  using (private.can_manage_item(id))
  with check (((( SELECT private.my_role() AS my_role) = 'admin'::text) OR ((( SELECT private.my_role() AS my_role) = 'circle_lead'::text) AND ((circle IS NULL) OR (circle = ANY (private.my_lead_circles())) OR (created_by = ( SELECT auth.uid() AS uid))))));

create policy "bookers and managers update bookings" on public.bookings as permissive for update to public
  using (((user_id = ( SELECT auth.uid() AS uid)) OR private.can_manage_item(item_id)))
  with check (((user_id = ( SELECT auth.uid() AS uid)) OR private.can_manage_item(item_id)));

create policy "joining members book" on public.bookings as permissive for insert to public
  with check (((user_id = ( SELECT auth.uid() AS uid)) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['joining'::text, 'member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))));

create policy "members see bookings" on public.bookings as permissive for select to public
  using (((user_id = ( SELECT auth.uid() AS uid)) OR (( SELECT private.my_role() AS my_role) = ANY (ARRAY['joining'::text, 'member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))));

create policy "admin can update any agreement" on public.collaboration_agreements as permissive for update to public
  using ((auth.uid() IN ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.role = ANY (ARRAY['admin'::text, 'project_lead'::text])))));

create policy "admin can view all agreements" on public.collaboration_agreements as permissive for select to public
  using ((auth.uid() IN ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.role = ANY (ARRAY['admin'::text, 'project_lead'::text])))));

create policy "joining users can submit agreements" on public.collaboration_agreements as permissive for insert to public
  with check (((auth.uid() = user_id) AND (auth.uid() IN ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.role <> 'explorer'::text)))));

create policy "users can update own pending agreement" on public.collaboration_agreements as permissive for update to public
  using (((auth.uid() = user_id) AND (status = 'pending'::text)));

create policy "users can view own agreements" on public.collaboration_agreements as permissive for select to public
  using ((auth.uid() = user_id));

create policy "Communities: authenticated insert" on public.communities as permissive for insert to public
  with check ((auth.role() = 'authenticated'::text));

create policy "Communities: co-creator update" on public.communities as permissive for update to public
  using (((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM community_members
  WHERE ((community_members.community_id = communities.id) AND (community_members.user_id = auth.uid()) AND (community_members.role = 'co_creator'::text) AND (community_members.status = 'active'::text))))));

create policy "Communities: public read" on public.communities as permissive for select to public
  using (((visibility = 'public'::text) OR (auth.uid() = created_by)));

create policy "Members: insert own" on public.community_members as permissive for insert to public
  with check ((auth.uid() = user_id));

create policy "Members: read if authenticated" on public.community_members as permissive for select to public
  using ((auth.role() = 'authenticated'::text));

create policy "Members: update own" on public.community_members as permissive for update to public
  using ((auth.uid() = user_id));

create policy cv_read_all on public.community_values as permissive for select to public
  using (true);

create policy cv_write_admin on public.community_values as permissive for all to public
  using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::text, 'circle_lead'::text]))))));

create policy "Anyone authenticated can read deliverable subscriptions" on public.deliverable_subscriptions as permissive for select to public
  using ((auth.uid() IS NOT NULL));

create policy "Users can subscribe to deliverables" on public.deliverable_subscriptions as permissive for insert to public
  with check ((auth.uid() = user_id));

create policy "Users can unsubscribe from deliverables" on public.deliverable_subscriptions as permissive for delete to public
  using ((auth.uid() = user_id));

create policy del_read_all on public.deliverables as permissive for select to public
  using (true);

create policy del_write_auth on public.deliverables as permissive for all to public
  using ((auth.uid() IS NOT NULL))
  with check ((auth.uid() IS NOT NULL));

create policy "deliverables deletes need a project manager" on public.deliverables as restrictive for delete to public
  using (private.can_manage_project(project_id));

create policy "deliverables edits need a project manager" on public.deliverables as restrictive for update to public
  using (private.can_manage_project(project_id))
  with check (private.can_manage_project(project_id));

create policy "deliverables writes need a project manager" on public.deliverables as restrictive for insert to public
  with check (private.can_manage_project(project_id));

create policy "signed-in users read rsvps" on public.event_rsvps as permissive for select to public
  using (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE (e.id = event_rsvps.event_id)))));

create policy "users change their rsvp" on public.event_rsvps as permissive for update to public
  using ((user_id = ( SELECT auth.uid() AS uid)))
  with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy "users remove their rsvp" on public.event_rsvps as permissive for delete to public
  using ((user_id = ( SELECT auth.uid() AS uid)));

create policy "users rsvp for themselves" on public.event_rsvps as permissive for insert to public
  with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE (e.id = event_rsvps.event_id)))));

create policy "events are readable" on public.events as permissive for select to public
  using ((is_public OR (( SELECT private.my_role() AS my_role) = ANY (ARRAY['joining'::text, 'member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))));

create policy "members can create events" on public.events as permissive for insert to public
  with check (((created_by = ( SELECT auth.uid() AS uid)) AND (((kind = 'community'::text) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['joining'::text, 'member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))) OR ((kind = 'core'::text) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))))));

create policy "members can create tasks" on public.events as permissive for insert to public
  with check (((created_by = ( SELECT auth.uid() AS uid)) AND (kind = 'task'::text) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))));

create policy "owners and leads can delete events" on public.events as permissive for delete to public
  using (((created_by = ( SELECT auth.uid() AS uid)) OR (( SELECT private.my_role() AS my_role) = 'admin'::text) OR ((( SELECT private.my_role() AS my_role) = 'circle_lead'::text) AND (circle = ANY (private.my_lead_circles())))));

create policy "owners and leads can update events" on public.events as permissive for update to public
  using (((created_by = ( SELECT auth.uid() AS uid)) OR (( SELECT private.my_role() AS my_role) = 'admin'::text) OR ((( SELECT private.my_role() AS my_role) = 'circle_lead'::text) AND (circle = ANY (private.my_lead_circles())))))
  with check ((((created_by = ( SELECT auth.uid() AS uid)) OR (( SELECT private.my_role() AS my_role) = 'admin'::text) OR ((( SELECT private.my_role() AS my_role) = 'circle_lead'::text) AND (circle = ANY (private.my_lead_circles())))) AND ((kind = 'community'::text) OR (( SELECT private.my_role() AS my_role) = ANY (ARRAY['member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text])))));

create policy "editors add members" on public.org_unit_members as permissive for insert to public
  with check (private.can_edit_org_unit(unit_id));

create policy "editors change members" on public.org_unit_members as permissive for update to public
  using (private.can_edit_org_unit(unit_id))
  with check (private.can_edit_org_unit(unit_id));

create policy "editors remove members" on public.org_unit_members as permissive for delete to public
  using (private.can_edit_org_unit(unit_id));

create policy "org members are public" on public.org_unit_members as permissive for select to public
  using (true);

create policy "circle leads add teams" on public.org_units as permissive for insert to public
  with check (((kind = 'team'::text) AND (created_by = ( SELECT auth.uid() AS uid)) AND private.can_lead_circle(circle)));

create policy "circle leads remove teams" on public.org_units as permissive for delete to public
  using (((kind = 'team'::text) AND private.can_lead_circle(circle)));

create policy "editors update units" on public.org_units as permissive for update to public
  using (private.can_edit_org_unit(id))
  with check ((private.can_edit_org_unit(id) AND ((kind = 'circle'::text) OR private.can_lead_circle(circle) OR (circle = ( SELECT o.circle
   FROM org_units o
  WHERE (o.id = org_units.id))))));

create policy "org chart is public" on public.org_units as permissive for select to public
  using (true);

create policy "Anyone authenticated can read project subscriptions" on public.project_subscriptions as permissive for select to public
  using ((auth.uid() IS NOT NULL));

create policy "Users can subscribe to projects" on public.project_subscriptions as permissive for insert to public
  with check ((auth.uid() = user_id));

create policy "Users can unsubscribe from projects" on public.project_subscriptions as permissive for delete to public
  using ((auth.uid() = user_id));

create policy "admin can post updates" on public.project_updates as permissive for insert to public
  with check ((auth.uid() IN ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.role = ANY (ARRAY['admin'::text, 'project_lead'::text, 'circle_lead'::text])))));

create policy "anyone can view updates" on public.project_updates as permissive for select to public
  using (true);

create policy "admin can update projects" on public.projects as permissive for update to public
  using ((auth.uid() IN ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.role = ANY (ARRAY['admin'::text, 'project_lead'::text])))));

create policy "anyone can view projects" on public.projects as permissive for select to public
  using (true);

create policy "circle leads can update projects in their circles" on public.projects as permissive for update to authenticated
  using (((circle IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = 'circle_lead'::text) AND (projects.circle = ANY (up.lead_circles)))))));

create policy "members can propose projects" on public.projects as permissive for insert to authenticated
  with check (((status = 'pending'::text) AND (created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['joining'::text, 'member'::text, 'advisor'::text])))))));

create policy "ops leads can create projects" on public.projects as permissive for insert to authenticated
  with check (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::text, 'circle_lead'::text, 'project_lead'::text])))))));

create policy anyone_read_comments on public.proposal_comments as permissive for select to public
  using (true);

create policy members_delete_comments on public.proposal_comments as permissive for delete to public
  using ((auth.uid() = user_id));

create policy members_insert_comments on public.proposal_comments as permissive for insert to public
  with check ((auth.uid() = user_id));

create policy anyone_read_votes on public.proposal_votes as permissive for select to public
  using (true);

create policy members_delete_votes on public.proposal_votes as permissive for delete to public
  using ((auth.uid() = user_id));

create policy members_insert_votes on public.proposal_votes as permissive for insert to public
  with check ((auth.uid() = user_id));

create policy members_update_votes on public.proposal_votes as permissive for update to public
  using ((auth.uid() = user_id));

create policy "vote changes follow layer eligibility" on public.proposal_votes as restrictive for update to public
  with check ((((layer = 'sociocracy'::text) AND (( SELECT private.my_role() AS my_role) = 'circle_lead'::text)) OR ((layer = 'democracy'::text) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))) OR ((layer = 'merit'::text) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['advisor'::text, 'admin'::text])))));

create policy "votes follow layer eligibility" on public.proposal_votes as restrictive for insert to public
  with check ((((layer = 'sociocracy'::text) AND (( SELECT private.my_role() AS my_role) = 'circle_lead'::text)) OR ((layer = 'democracy'::text) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))) OR ((layer = 'merit'::text) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['advisor'::text, 'admin'::text])))));

create policy anyone_read_proposals on public.proposals as permissive for select to public
  using (true);

create policy members_insert_proposals on public.proposals as permissive for insert to public
  with check ((auth.uid() = proposer_id));

create policy "proposals come from full members" on public.proposals as restrictive for insert to public
  with check ((( SELECT private.my_role() AS my_role) = ANY (ARRAY['member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text])));

create policy proposer_update_proposals on public.proposals as permissive for update to public
  using ((auth.uid() = proposer_id));

create policy "achievements must be earned" on public.user_achievements as restrictive for insert to public
  with check (((( SELECT private.my_role() AS my_role) = 'admin'::text) OR (achievement_key = 'profile_complete'::text) OR ((achievement_key = 'community_joiner'::text) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['joining'::text, 'member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))) OR ((achievement_key = 'community_member'::text) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text])))));

create policy users_insert_own_achievements on public.user_achievements as permissive for insert to public
  with check ((auth.uid() = user_id));

create policy users_read_own_achievements on public.user_achievements as permissive for select to public
  using ((auth.uid() = user_id));

create policy "Anyone can view bios" on public.user_bio as permissive for select to public
  using (true);

create policy "Users can delete their own bio" on public.user_bio as permissive for delete to public
  using ((user_id = auth.uid()));

create policy "Users can insert their own bio" on public.user_bio as permissive for insert to public
  with check ((user_id = auth.uid()));

create policy "Users can update their own bio" on public.user_bio as permissive for update to public
  using ((user_id = auth.uid()));

create policy "Prefs: manage own" on public.user_community_prefs as permissive for all to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy "Prefs: read if authenticated" on public.user_community_prefs as permissive for select to public
  using ((auth.role() = 'authenticated'::text));

create policy "Connections: insert as sender" on public.user_connections as permissive for insert to public
  with check ((auth.uid() = from_user_id));

create policy "Connections: read own" on public.user_connections as permissive for select to public
  using (((auth.uid() = from_user_id) OR (auth.uid() = to_user_id)));

create policy "Connections: update own" on public.user_connections as permissive for update to public
  using (((auth.uid() = from_user_id) OR (auth.uid() = to_user_id)));

create policy "Offers: manage own" on public.user_offers as permissive for all to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

create policy "Offers: public read" on public.user_offers as permissive for select to public
  using (true);

create policy "Anyone can view profiles" on public.user_profiles as permissive for select to public
  using (true);

create policy "Profiles: insert own" on public.user_profiles as permissive for insert to public
  with check ((auth.uid() = id));

create policy "Profiles: update own" on public.user_profiles as permissive for update to public
  using ((auth.uid() = id));

create policy "admins can update any profile" on public.user_profiles as permissive for update to public
  using (is_admin());

create policy "Anyone can view requests" on public.user_requests as permissive for select to public
  using (true);

create policy "Users can delete their own requests" on public.user_requests as permissive for delete to public
  using ((user_id = auth.uid()));

create policy "Users can insert their own requests" on public.user_requests as permissive for insert to public
  with check ((user_id = auth.uid()));

create policy "Users can update their own requests" on public.user_requests as permissive for update to public
  using ((user_id = auth.uid()));

create policy vs_delete_own on public.value_signatures as permissive for delete to public
  using ((user_id = auth.uid()));

create policy vs_read_all on public.value_signatures as permissive for select to public
  using (true);

create policy vs_write_own on public.value_signatures as permissive for insert to public
  with check ((user_id = auth.uid()));

-- ── Storage: avatars bucket ─────────────────────────────────────────────

create policy "Avatar images are publicly accessible" on storage.objects as permissive for select to public
  using ((bucket_id = 'avatars'::text));

create policy "Users can delete their own avatar" on storage.objects as permissive for delete to public
  using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

create policy "Users can update their own avatar" on storage.objects as permissive for update to public
  using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

create policy "Users can upload their own avatar" on storage.objects as permissive for insert to public
  with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

-- ── Function permissions ────────────────────────────────────────────────
-- Table grants are Supabase's defaults (anon/authenticated/service_role); RLS does the gating.

revoke execute on function public.promote_to_member_if_eligible() from public, anon;
grant execute on function public.promote_to_member_if_eligible() to authenticated, service_role;

-- ── Storage: public avatars bucket (policies are in the RLS section) ───

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ── Auto-enable RLS on any new public table ─────────────────────────────

do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable();
  end if;
end $$;
