---
bump: minor
title: Pick your stay on a calendar that shows what's free, with prices and an estimated total
public:
  - A place to stay shows its prices (a night, a week, a month) and a calendar of free and taken nights. Tap your check-in day, then your check-out day.
  - Once you pick dates you see an estimated total. It's an estimate; whoever approves your stay confirms the price.
  - The calendar shows free and taken nights only. Names are for the people who manage the place.
  - An admin can say that only admins approve a place's requests ("Only admins approve" in its Edit form).
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
- **Only admins approve** (Sonia: "Admins only"): `booking_items.admins_approve`, a tick in the Edit form only
  admins see. When on, a circle lead who manages the item can still edit it, but can't approve, decline or
  change other people's bookings of it, and can't switch approval off. Off by default: nothing changes for
  an item until an admin turns it on. The requests list and the texts ("needs an admin's approval") follow it.
- Fix: archiving or restoring an item no longer drops its photos and pin until the next reload.

**Migrations:** `20261230000000_stay_prices.sql` (two columns, two checks; no policy change) and
`20261231000000_admins_approve.sql` (one column, a new `booking_items_guard` trigger, and `bookings_guard`
rewritten with the admins-only case; no policy change). The page works before they're applied: prices, guest
counts and the switch are read on their own. An admin can't save an item until the second one is applied.

**Boundary check** (throwaway local Postgres 17, fake accounts, the baseline's functions and policies): on an
admins-only item a circle lead who manages it is refused confirm, decline, cancelling someone else's booking,
confirming their own, turning the switch off or on, and changing "needs approval"; they can still edit the
item, cancel their own booking and approve requests for other items. A member can still only cancel their
own. An admin can do all of it.

**Second brain:** prices and stay requests are not written there yet. Follow-up: a note per place under the
community's knowledge folder with its prices and a link back to the portal, kept in step when an admin edits it.
