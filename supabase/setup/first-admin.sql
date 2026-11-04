-- Make a new community's first admin. Every signup starts as an explorer and only
-- an admin can change roles, so the first one is set here, as the database owner
-- (SQL editor, `supabase db query`, or the Management API).
-- 1. The person signs up on the portal and confirms their email.
-- 2. Replace the email below and run this once.
update public.user_profiles
set role = 'admin'
where id = (select id from auth.users where lower(email) = lower('first.admin@example.com'));

-- Check: should return one row with role = admin
select p.username, p.role from public.user_profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('first.admin@example.com');
