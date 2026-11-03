-- The app's role ladder includes 'advisor' (Admin › Users offers it, RLS policies
-- grant it member-level access), but the role check never allowed it, so making
-- someone an advisor failed.
alter table public.user_profiles
  drop constraint user_profiles_role_check,
  add constraint user_profiles_role_check check (role = any (array[
    'explorer', 'joining', 'member', 'advisor', 'circle_lead', 'project_lead', 'admin'
  ]));
