---
bump: minor
title: Pick your stay on a calendar that shows what's free, with prices and an estimated total
public:
  - A place to stay shows its prices (a night, a week, a month) and a calendar of free and taken nights. Tap your check-in day, then your check-out day.
  - Once you pick dates you see an estimated total. It's an estimate; whoever approves your stay confirms the price.
  - The calendar shows free and taken nights only. Names are for the people who manage the place.
  - Admins and circle leads set a place's prices in its Edit form, and see how many people and about how much on each request.
---
Sonia: "improve the booking for the rooms, make it airbnb style with availability visible for people that
would be booking… and a price list for each", then "I wanted the first option, estimated total".

- **Availability calendar** (`m15-bookings/StayCalendar.tsx`, `stay-calendar.css`): in the v4 look, an
  accommodation's pop-up replaces the "Booked times" list and the two date fields with two months (one on a
  phone). Taken nights are crossed out; you can check out on the day the next stay starts; your own stay is
  marked. No names: a "Who's staying" list under it is for whoever can manage the place. Tools and spaces,
  and the older look, are unchanged.
- **Prices**: `booking_items.stay_prices` (jsonb: `night`, `week`, `month`, and `two` for two people sharing),
  set in the item's Edit form, shown on the card ("$70 a night") and in the pop-up. The community's rules on
  top are new config, `"stays": { currency, vatPercent, longStay, notes }` (→ `NEXT_PUBLIC_STAY_RULES`).
- **Estimated total** (`m15-bookings/lib/pricing.ts` › `estimateStay`): whole months, then whole weeks, then
  nights; a few nights never cost more than the week they'd fill; long-stay discount on whole months; tax last.
  Always labelled an estimate, and nothing is charged. One function, so a community that charges differently
  changes it and its config, not the screens.
- **Guests**: `bookings.guests` (how many people), asked when the place holds two or more; requests in
  Admin › Bookings show it with "about $…".
- Fix: archiving or restoring an item no longer drops its photos and pin until the next reload.

**Migration:** `20261230000000_stay_prices.sql` (two columns, two checks; no policy change). The page works
before it's applied: prices and guest counts are read on their own.

**Second brain:** prices and stay requests are not written there yet. Follow-up: a note per place under the
community's knowledge folder with its prices and a link back to the portal, kept in step when an admin edits it.
