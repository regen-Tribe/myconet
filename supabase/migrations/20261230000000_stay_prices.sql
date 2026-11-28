-- Prices for places to stay, and how many people a stay is for.
--
-- booking_items.stay_prices: what a stay costs, before tax. Null = no price shown.
--   { "night": 70, "week": 490, "month": 1700, "two": { "night": 90, "week": 660, "month": 2300 } }
--   Every key is optional; "two" is the price when two people share it.
--   The community's rules on top (currency, tax, long-stay discounts) are in its config: "stays".
-- bookings.guests: how many people the stay is for, so whoever approves it can quote the right price.
--
-- No policy changes: both columns follow the tables' existing rules (item managers edit items;
-- the booker writes their own booking).

alter table public.booking_items
  add column if not exists stay_prices jsonb;

alter table public.booking_items
  drop constraint if exists booking_items_stay_prices_check;
alter table public.booking_items
  add constraint booking_items_stay_prices_check
  check (stay_prices is null or jsonb_typeof(stay_prices) = 'object');

alter table public.bookings
  add column if not exists guests smallint not null default 1;

alter table public.bookings
  drop constraint if exists bookings_guests_check;
alter table public.bookings
  add constraint bookings_guests_check check (guests between 1 and 50);
