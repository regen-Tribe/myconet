-- Circles become data: each community defines its own (set during setup, see
-- INSTANCES.md §6). Projects, events, bookable items, the org chart and circle
-- leadership all refer to circles(slug).
create table public.circles (
  slug        text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  name        text not null check (length(trim(name)) between 1 and 60),
  emoji       text not null default '◯' check (length(emoji) <= 8),
  color       text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order  integer not null default 0,
  -- Retired circles are hidden from pickers but keep their old projects/events
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.circles enable row level security;

create policy "circles are public" on public.circles
  for select to anon, authenticated using (true);
create policy "admins add circles" on public.circles
  for insert to authenticated with check ((select private.my_role()) = 'admin');
create policy "admins edit circles" on public.circles
  for update to authenticated
  using ((select private.my_role()) = 'admin')
  with check ((select private.my_role()) = 'admin');
-- No delete policy: retire a circle with archived_at instead.

create trigger circles_touch_updated_at before update on public.circles
  for each row execute function public.touch_events_updated_at();

-- Every circle gets its org-chart unit (M17) automatically.
create function public.circles_create_org_unit()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  insert into public.org_units (kind, circle, name, sort_order, created_by)
  values ('circle', new.slug, new.name, new.sort_order, null)
  on conflict do nothing;
  return new;
end $$;
revoke execute on function public.circles_create_org_unit() from public, anon, authenticated;

create trigger circles_create_org_unit after insert on public.circles
  for each row execute function public.circles_create_org_unit();
