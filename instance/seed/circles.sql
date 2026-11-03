-- RTRN's circles (the five regenerative pillars). Applied to RTRN's database
-- between 20261104000200_circles and 20261104000300_circles_foreign_keys.
insert into public.circles (slug, name, emoji, color, sort_order) values
  ('ecology',   'Ecology',   '🌱', '#15803d', 1),
  ('hardware',  'Hardware',  '🔧', '#b45309', 2),
  ('humanware', 'Humanware', '🤝', '#be185d', 3),
  ('economy',   'Economy',   '💱', '#0369a1', 4),
  ('tech',      'Tech',      '⚙️', '#7c3aed', 5)
on conflict (slug) do nothing;
