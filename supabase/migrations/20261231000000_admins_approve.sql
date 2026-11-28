-- A bookable thing can say that only admins approve its requests.
--
-- booking_items.admins_approve (default false = as before: an admin or the circle lead who manages
-- the item decides). When true:
--   - only an admin can confirm or decline a request for it, or change someone else's booking of it;
--     a circle lead who manages the item can still edit the item, and cancel their own booking;
--   - only an admin can turn the switch on or off, or change "needs approval" on that item
--     (otherwise a lead could switch approval off and let requests confirm on their own).
--
-- No policy changes: both rules are in triggers, on top of the existing policies.

alter table public.booking_items
  add column if not exists admins_approve boolean not null default false;

-- Who may set the switch
create or replace function public.booking_items_guard()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  -- No signed-in person (migrations, the service role): nothing to check
  if (select auth.uid()) is null or (select private.my_role()) = 'admin' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.admins_approve := false;
    return new;
  end if;
  if new.admins_approve is distinct from old.admins_approve then
    raise exception 'Only an admin can change who approves requests';
  end if;
  if old.admins_approve and new.requires_approval is distinct from old.requires_approval then
    raise exception 'Only an admin can change whether this needs approval';
  end if;
  return new;
end $function$;

drop trigger if exists booking_items_guard on public.booking_items;
create trigger booking_items_guard before insert or update on public.booking_items
  for each row execute function public.booking_items_guard();

-- Who may decide a request: the same guard as before, plus the admins-only case
create or replace function public.bookings_guard()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
declare
  v_item public.booking_items;
  v_manager boolean;
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
  v_manager := private.can_manage_item(new.item_id);
  if v_manager and (not coalesce(v_item.admins_approve, false) or (select private.my_role()) = 'admin') then
    if new.status is distinct from old.status and new.status in ('confirmed', 'declined') then
      new.decided_by := (select auth.uid());
    end if;
    return new;
  end if;

  -- A lead who manages an admins-only item gets past the update policy; here they are a booker like any other
  if v_manager and old.user_id is distinct from (select auth.uid()) then
    raise exception 'Only an admin can approve, decline or change this booking';
  end if;

  if new.status <> 'cancelled'
     or new.item_id <> old.item_id or new.user_id <> old.user_id
     or new.starts_at <> old.starts_at or new.ends_at <> old.ends_at
     or new.decided_by is distinct from old.decided_by then
    raise exception 'You can only cancel your own booking';
  end if;
  return new;
end $function$;
