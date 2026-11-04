-- The Blueprint's Circles setup step (INSTANCES.md §6.2).

-- Lead names found during setup (Step D). Only a note: real circle leads are
-- assigned in Admin › Users once those people have accounts.
alter table public.circles
  add column leads_to_assign text check (length(leads_to_assign) <= 300);

-- Renaming a circle renames its org-chart unit. (The circle's purpose is the
-- unit's description, edited on the Circles page or in the setup step.)
create function public.circles_rename_org_unit()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  update public.org_units set name = new.name
  where kind = 'circle' and circle = new.slug;
  return new;
end $$;
revoke execute on function public.circles_rename_org_unit() from public, anon, authenticated;

create trigger circles_rename_org_unit after update of name on public.circles
  for each row when (old.name is distinct from new.name)
  execute function public.circles_rename_org_unit();
