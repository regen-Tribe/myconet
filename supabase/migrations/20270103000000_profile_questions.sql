-- The questions a community that hosts people asks ("Coming to Protopia", step 2; Sonia, 28 Nov 2026).
-- Edit profile asks them when the community turns on "hostingQuestions" (instance/config.jsonc); a stay
-- request will ask the same ones later, so each is kept once per person, never on the booking:
--
--   user_intake   what brings you, daily work, experience with work exchange, ideas to start here,
--                 and "Keep me posted" (news and events by email)
--   user_food     diet and allergies: personal data
--
-- Who reads what (the database decides, not the screen):
--   user_intake   the person · admins · leads of a circle with the 'hosting' duty
--   user_food     the person · admins · leads of a 'hosting' circle · everyone in a 'kitchen' circle
-- Nobody else, and never a visitor. Neither table is written to the second brain.
--
-- Core can't name a community's circles, so a circle says what it does: circles.duties.
-- A community sets it in its own migration (Protopia: hospitality hosts, kitchen cooks).
-- Safe to run again.

-- ── Which circle hosts, which cooks ───────────────────────────────────────────────────────────────
alter table public.circles add column if not exists duties text[] not null default '{}';
alter table public.circles drop constraint if exists circles_duties_known;
alter table public.circles add constraint circles_duties_known
  check (duties <@ array['hosting', 'kitchen']::text[]);
comment on column public.circles.duties is
  'What the circle does for people who stay: hosting = its leads look after guests (they read user_intake and user_food); kitchen = everyone in it cooks (they read user_food).';

-- An admin, or a lead of a circle that hosts
create or replace function private.hosts_guests()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((select private.my_role()) = 'admin', false)
      or exists (
        select 1 from public.circles c
         where 'hosting' = any (c.duties) and c.archived_at is null
           and (select private.my_role()) = 'circle_lead'
           and c.slug = any (private.my_lead_circles())
      )
$$;
revoke all on function private.hosts_guests() from public, anon;
grant execute on function private.hosts_guests() to authenticated;

-- The same people, plus everyone in a circle that cooks
create or replace function private.reads_food_needs()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select (select private.hosts_guests())
      or exists (
        select 1 from public.circles c
         where 'kitchen' = any (c.duties) and c.archived_at is null
           and private.in_circle(c.slug)
      )
$$;
revoke all on function private.reads_food_needs() from public, anon;
grant execute on function private.reads_food_needs() to authenticated;

-- ── What brings you, daily work, experience, ideas, keep me posted ────────────────────────────────
create table if not exists public.user_intake (
  user_id             uuid primary key references public.user_profiles (id) on delete cascade,
  what_brings_you     text check (what_brings_you is null or char_length(what_brings_you) <= 2000),
  -- Daily work commitments for outside or personal projects
  daily_work          text check (daily_work is null or daily_work in ('no', 'part_time', 'full_time')),
  -- Work exchange, farms or communities before
  exchange_experience text check (exchange_experience is null or char_length(exchange_experience) <= 2000),
  -- [{ "id": "…", "title": "…", "project_id": "<uuid, once it's an idea on the board>" }]
  ideas               jsonb not null default '[]'::jsonb
                      check (jsonb_typeof(ideas) = 'array' and jsonb_array_length(ideas) <= 20),
  -- News and events by email; keep_posted_at is when they last said yes
  keep_posted         boolean not null default false,
  keep_posted_at      timestamptz,
  updated_at          timestamptz not null default now()
);

alter table public.user_intake enable row level security;
revoke all on table public.user_intake from anon;
grant select, insert, update, delete on table public.user_intake to authenticated;

drop policy if exists "people manage their own intake" on public.user_intake;
create policy "people manage their own intake" on public.user_intake
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "hosts read intake" on public.user_intake;
create policy "hosts read intake" on public.user_intake
  for select to authenticated
  using ((select private.hosts_guests()));

drop trigger if exists user_intake_touch_updated_at on public.user_intake;
create trigger user_intake_touch_updated_at before update on public.user_intake
  for each row execute function public.touch_events_updated_at();

-- ── Diet and allergies ────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_food (
  user_id    uuid primary key references public.user_profiles (id) on delete cascade,
  -- 'none' = no restrictions; several may apply (vegan and gluten-free)
  diet       text[] not null default '{}'
             check (diet <@ array['none', 'vegetarian', 'vegan', 'gluten_free', 'other']::text[]),
  diet_other text check (diet_other is null or char_length(diet_other) <= 200),
  -- "None", or what they are
  allergies  text check (allergies is null or char_length(allergies) <= 500),
  updated_at timestamptz not null default now()
);

alter table public.user_food enable row level security;
revoke all on table public.user_food from anon;
grant select, insert, update, delete on table public.user_food to authenticated;

drop policy if exists "people manage their own food needs" on public.user_food;
create policy "people manage their own food needs" on public.user_food
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "hosts and the kitchen read food needs" on public.user_food;
create policy "hosts and the kitchen read food needs" on public.user_food
  for select to authenticated
  using ((select private.reads_food_needs()));

drop trigger if exists user_food_touch_updated_at on public.user_food;
create trigger user_food_touch_updated_at before update on public.user_food
  for each row execute function public.touch_events_updated_at();
