-- M15 Bookings: the community's shared inventory — accommodation, tools, spaces.
--   - admins and circle leads add items to the inventory
--   - joining members and above book them
--   - overlapping bookings of the same item are impossible (exclusion constraint)
--   - items can require approval; otherwise bookings confirm instantly

create extension if not exists btree_gist with schema extensions;

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  category text not null check (category in ('accommodation', 'tools', 'spaces')),
  tags text[] not null default '{}',
  circle text check (circle in ('ecology', 'hardware', 'humanware', 'economy', 'tech')),
  location text,
  capacity int check (capacity is null or capacity > 0),
  requires_approval boolean not null default false,
  is_active boolean not null default true,
  created_by uuid default auth.uid() references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index booking_items_category_idx on public.booking_items (category) where is_active;
create index booking_items_created_by_idx on public.booking_items (created_by);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.booking_items(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.user_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  note text,
  decided_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint bookings_no_overlap exclude using gist (
    item_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);

create index bookings_user_id_idx on public.bookings (user_id);
create index bookings_item_starts_idx on public.bookings (item_id, starts_at);
create index bookings_decided_by_idx on public.bookings (decided_by) where decided_by is not null;

-- Who can manage an item: admin, or a circle lead when the item has no circle,
-- is in one of their circles, or they added it.
create or replace function private.can_manage_item(p_item_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
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
$$;

-- New bookings: status comes from the item (pending if it needs approval), never from the client.
-- Updates: a booker who can't manage the item may only cancel; nothing else changes.
create or replace function public.bookings_guard()
returns trigger language plpgsql set search_path = '' as $$
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
end $$;

create trigger bookings_guard before insert or update on public.bookings
  for each row execute function public.bookings_guard();

create trigger booking_items_touch_updated_at before update on public.booking_items
  for each row execute function public.touch_events_updated_at();

alter table public.booking_items enable row level security;
alter table public.bookings enable row level security;

-- Items: everyone can browse active items; managers also see archived ones
create policy "anyone can browse active items" on public.booking_items for select
  using (is_active or (select private.my_role()) in ('admin', 'circle_lead'));

create policy "leads add items" on public.booking_items for insert
  with check (
    created_by = (select auth.uid())
    and (
      (select private.my_role()) = 'admin'
      or ((select private.my_role()) = 'circle_lead' and (circle is null or circle = any (private.my_lead_circles())))
    )
  );

create policy "leads edit items" on public.booking_items for update
  using (private.can_manage_item(id))
  with check (
    (select private.my_role()) = 'admin'
    or ((select private.my_role()) = 'circle_lead' and (circle is null or circle = any (private.my_lead_circles()) or created_by = (select auth.uid())))
  );

create policy "leads delete items" on public.booking_items for delete
  using (private.can_manage_item(id));

-- Bookings: joining+ see the schedule (who has what, when); explorers see only their own
create policy "members see bookings" on public.bookings for select
  using (
    user_id = (select auth.uid())
    or (select private.my_role()) in ('joining', 'member', 'circle_lead', 'project_lead', 'advisor', 'admin')
  );

create policy "joining members book" on public.bookings for insert
  with check (
    user_id = (select auth.uid())
    and (select private.my_role()) in ('joining', 'member', 'circle_lead', 'project_lead', 'advisor', 'admin')
  );

create policy "bookers and managers update bookings" on public.bookings for update
  using (user_id = (select auth.uid()) or private.can_manage_item(item_id))
  with check (user_id = (select auth.uid()) or private.can_manage_item(item_id));

grant execute on function private.can_manage_item(uuid) to authenticated, anon;
