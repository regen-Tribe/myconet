-- RTRN's circles and roles: the neighborhood org chart, the same as core's default
-- template (web/src/modules/m04-blueprint/lib/circle-setup.ts). Roles are org-chart
-- teams inside each circle. For a fresh database: run after 20261104000200_circles.
-- (RTRN itself started on the five pillars; switch-to-neighborhood-circles.sql moved it over.)
insert into public.circles (slug, name, emoji, color, sort_order) values
  ('community-management', 'Community Management', '🤝', '#be185d', 1),
  ('venue-management',     'Venue Management',     '🏡', '#b45309', 2),
  ('space-maintenance',    'Space Maintenance',    '🔧', '#0369a1', 3),
  ('kitchen-management',   'Kitchen Management',   '🍳', '#c2410c', 4),
  ('marketing-outreach',   'Marketing & Outreach', '📣', '#a21caf', 5),
  ('sustainable-systems',  'Sustainable Systems',  '🌱', '#15803d', 6),
  ('operations',           'Operations',           '📋', '#57534e', 7),
  ('strategy',             'Strategy',             '🧭', '#0f766e', 8)
on conflict (slug) do nothing;

-- Purposes live on each circle's org unit (created by the circles insert trigger)
update public.org_units u set description = p.purpose
from (values
  ('community-management', 'Volunteers, leaders, welcoming new members and holding community circles'),
  ('venue-management',     'Hospitality, preparing rooms, rental requests and events'),
  ('space-maintenance',    'Cleaning, property repairs, and wifi and connectivity'),
  ('kitchen-management',   'Food lists, the weekly meal plan and the cooking rota'),
  ('marketing-outreach',   'Content strategy, social media and promoting events'),
  ('sustainable-systems',  'Energy, water, waste management and permaculture'),
  ('operations',           'Project management, team dynamics and finance'),
  ('strategy',             'Vision, mission, values and timeline')
) as p(slug, purpose)
where u.kind = 'circle' and u.circle = p.slug and u.description is null;

insert into public.org_units (kind, circle, name, description, sort_order, created_by)
select 'team', r.circle, r.name, r.description, r.sort_order, null
from (values
  ('community-management', 'Volunteer Lead',         E'• Point of contact for volunteers', 1),
  ('community-management', 'Community Manager',      E'• Point of contact for leaders\n• High-level logistics', 2),
  ('community-management', 'Community Host',         E'• Onboards new community members to the space\n• Offers support with house and room logistics to community members', 3),
  ('community-management', 'Community Space Holder', E'• Hosting community circles\n• Holding heart space for community members', 4),
  ('venue-management',     'Hospitality Lead',       E'• Preparing rooms\n• Managing rental requests\n• Shares available locations with marketing', 1),
  ('venue-management',     'Events Lead',            E'• Planning events\n• Collaborating with the marketing lead to market events', 2),
  ('space-maintenance',    'Cleaning Lead',          E'• Creating the cleaning schedule\n• Overseeing the cleaning culture in the community\n• Managing cleaning fairies', 1),
  ('space-maintenance',    'Maintenance Lead',       E'• Managing property fixes', 2),
  ('space-maintenance',    'Technology Lead',        E'• Manages wifi and connectivity issues', 3),
  ('kitchen-management',   'Kitchen Lead',           E'• Creating the food list\n• Overseeing cooking fairies\n• Weekly food plan and recipes', 1),
  ('kitchen-management',   'Cooking Fairy',          E'• Can be volunteers or community members\n• Cooking meals\n• Cleaning the dishes\n• Unpacking groceries', 2),
  ('marketing-outreach',   'Marketing / Social Media Manager', E'• Managing content strategy\n• Following up with content creators\n• Posting content', 1),
  ('marketing-outreach',   'Content Creator',        E'• Capturing content\n• Editing content', 2),
  ('sustainable-systems',  'Energy',                 null, 1),
  ('sustainable-systems',  'Water',                  null, 2),
  ('sustainable-systems',  'Waste Management',       null, 3),
  ('sustainable-systems',  'Permaculture',           null, 4)
) as r(circle, name, description, sort_order)
where not exists (select 1 from public.org_units u where u.kind = 'team' and u.circle = r.circle and u.name = r.name);
