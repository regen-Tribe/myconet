-- One-off, applied to RTRN on 2026-11-03 after circles.sql: move everything off the
-- five pillar circles onto the neighborhood org chart, then retire the old five.
-- Run circles.sql first. Nothing is removed.
with m(old, new) as (values
  ('tech', 'operations'), ('economy', 'operations'), ('humanware', 'community-management'),
  ('ecology', 'sustainable-systems'), ('hardware', 'space-maintenance'))
update public.projects p set circle = m.new from m where p.circle = m.old;

with m(old, new) as (values
  ('tech', 'operations'), ('economy', 'operations'), ('humanware', 'community-management'),
  ('ecology', 'sustainable-systems'), ('hardware', 'space-maintenance'))
update public.events e set circle = m.new from m where e.circle = m.old;

with m(old, new) as (values
  ('tech', 'operations'), ('economy', 'operations'), ('humanware', 'community-management'),
  ('ecology', 'sustainable-systems'), ('hardware', 'space-maintenance'))
update public.booking_items b set circle = m.new from m where b.circle = m.old;

-- Existing teams: "website" is outreach; "solar system" sits with Energy
update public.org_units set circle = 'marketing-outreach' where kind = 'team' and circle = 'tech' and name = 'website';
update public.org_units set circle = 'sustainable-systems' where kind = 'team' and circle = 'ecology';
with m(old, new) as (values
  ('tech', 'operations'), ('economy', 'operations'), ('humanware', 'community-management'),
  ('ecology', 'sustainable-systems'), ('hardware', 'space-maintenance'))
update public.org_units u set circle = m.new from m where u.kind = 'team' and u.circle = m.old;

-- Circle leads: map each old circle, dropping duplicates
update public.user_profiles up set lead_circles = (
  select coalesce(array_agg(distinct coalesce(m.new, c)), '{}') from unnest(up.lead_circles) c
  left join (values
    ('tech', 'operations'), ('economy', 'operations'), ('humanware', 'community-management'),
    ('ecology', 'sustainable-systems'), ('hardware', 'space-maintenance')) m(old, new) on m.old = c)
where up.lead_circles && array['tech', 'economy', 'humanware', 'ecology', 'hardware'];

update public.circles set archived_at = now()
where slug in ('ecology', 'hardware', 'humanware', 'economy', 'tech') and archived_at is null;
