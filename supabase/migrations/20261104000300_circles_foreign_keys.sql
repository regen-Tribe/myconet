-- Replace the fixed five-circle check constraints with references to circles.
-- Run after the community's circles exist (RTRN: instance/seed/circles.sql).
alter table public.events
  drop constraint events_circle_check,
  add constraint events_circle_fkey foreign key (circle) references public.circles (slug);
alter table public.booking_items
  drop constraint booking_items_circle_check,
  add constraint booking_items_circle_fkey foreign key (circle) references public.circles (slug);
alter table public.org_units
  drop constraint org_units_circle_check,
  add constraint org_units_circle_fkey foreign key (circle) references public.circles (slug);
alter table public.projects
  add constraint projects_circle_fkey foreign key (circle) references public.circles (slug);

create index events_circle_idx on public.events (circle) where circle is not null;
create index booking_items_circle_idx on public.booking_items (circle) where circle is not null;

-- lead_circles is an array, so it can't have a foreign key: check it on write.
create function public.validate_lead_circles()
 returns trigger
 language plpgsql
 set search_path to ''
as $$
declare v_bad text;
begin
  select c into v_bad from unnest(new.lead_circles) c
  where not exists (select 1 from public.circles where slug = c) limit 1;
  if v_bad is not null then
    raise exception 'Unknown circle "%"', v_bad using errcode = '23503';
  end if;
  return new;
end $$;

create trigger validate_lead_circles before insert or update of lead_circles on public.user_profiles
  for each row execute function public.validate_lead_circles();
