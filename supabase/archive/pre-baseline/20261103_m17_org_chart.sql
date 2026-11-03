-- M17 Org chart: the community's circles and the teams (departments) inside them.
--   - one 'circle' unit per pillar (seeded) holds the circle's purpose and members;
--     circle LEADS come from user_profiles.lead_circles (admin-managed, drives permissions)
--   - 'team' units sit inside a circle and have their own leads and members
-- Everyone can read it. Admins edit everything; circle leads edit their circle and its
-- teams; team leads edit their own team.

create table public.org_units (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('circle', 'team')),
  circle text not null check (circle in ('ecology', 'hardware', 'humanware', 'economy', 'tech')),
  name text not null check (length(trim(name)) > 0),
  description text,
  sort_order int not null default 0,
  created_by uuid default auth.uid() references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index org_units_one_per_circle on public.org_units (circle) where kind = 'circle';
create index org_units_circle_idx on public.org_units (circle, sort_order);
create index org_units_created_by_idx on public.org_units (created_by);

create table public.org_unit_members (
  unit_id uuid not null references public.org_units(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('lead', 'member')),
  title text check (title is null or length(title) <= 60),
  created_at timestamptz not null default now(),
  primary key (unit_id, user_id)
);
create index org_unit_members_user_idx on public.org_unit_members (user_id);

insert into public.org_units (kind, circle, name, sort_order, created_by) values
  ('circle', 'ecology',   'Ecology',   1, null),
  ('circle', 'hardware',  'Hardware',  2, null),
  ('circle', 'humanware', 'Humanware', 3, null),
  ('circle', 'economy',   'Economy',   4, null),
  ('circle', 'tech',      'Tech',      5, null);

-- Admin, or circle lead of this circle
create or replace function private.can_lead_circle(p_circle text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.my_role()) = 'admin'
      or ((select private.my_role()) = 'circle_lead' and p_circle = any (private.my_lead_circles()))
$$;

-- Admin, circle lead of the unit's circle, or a lead of this team
create or replace function private.can_edit_org_unit(p_unit_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
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
$$;

grant execute on function private.can_lead_circle(text), private.can_edit_org_unit(uuid) to anon, authenticated;

create trigger org_units_touch_updated_at before update on public.org_units
  for each row execute function public.touch_events_updated_at();

alter table public.org_units enable row level security;
alter table public.org_unit_members enable row level security;

create policy "org chart is public" on public.org_units for select using (true);
create policy "circle leads add teams" on public.org_units for insert
  with check (kind = 'team' and created_by = (select auth.uid()) and private.can_lead_circle(circle));
create policy "editors update units" on public.org_units for update
  using (private.can_edit_org_unit(id))
  -- moving a team to another circle needs leadership of the destination too
  with check (private.can_edit_org_unit(id) and (kind = 'circle' or private.can_lead_circle(circle) or circle = (select o.circle from public.org_units o where o.id = org_units.id)));
create policy "circle leads remove teams" on public.org_units for delete
  using (kind = 'team' and private.can_lead_circle(circle));

create policy "org members are public" on public.org_unit_members for select using (true);
create policy "editors add members" on public.org_unit_members for insert
  with check (private.can_edit_org_unit(unit_id));
create policy "editors change members" on public.org_unit_members for update
  using (private.can_edit_org_unit(unit_id)) with check (private.can_edit_org_unit(unit_id));
create policy "editors remove members" on public.org_unit_members for delete
  using (private.can_edit_org_unit(unit_id));
