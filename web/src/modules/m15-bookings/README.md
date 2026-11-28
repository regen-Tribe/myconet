# M15 — Accommodation (and the shared booking engine)

This folder runs two modules from one codebase:

- **M15 Accommodation** — `/accommodation`, accommodation only
- **M16 Resources** — `/resources`, tools and spaces — see `../m16-resources/README.md`

`BookingsClient` takes a `scope` (`stays` | `resources` | `amenities`, all categories on one page, used by the v4 menu since v4.42.0); `SCOPE_META` in `lib/inventory.ts` sets each page's number, label, route, accent (`--bk-accent`) and categories. The loader is `BookingsPage.tsx` (`renderBookings`).

- **Admins and circle leads** add items to the inventory, tag them, and approve requests
- **Joining members and above** book items
- **Everyone** (even logged out) can browse what's in the inventory

## What users see here

- **Browse** — category chips (🏡 Accommodation, 🔧 Tools, 🏛 Spaces), tag chips from the items in view, search; cards show "Free now" / "In use until …" for members
- **Item pop-up** — details, booked times (with who), and the booking form. Tools and spaces book by time. Overlaps are caught in the form and again by the database.
- **A place to stay** (v4 look) — its prices, then a calendar of free and taken nights: tap check-in, then check-out. No names on the calendar; whoever manages the place has a "Who's staying" list under it. Picked dates show an estimated total (never a charge), and the form asks how many people when the place holds two or more.
- **My bookings** — upcoming (with Cancel) and past/cancelled
- **Manage** (admins + circle leads) — pending requests with Approve/Decline, the inventory they can manage with Edit/Archive/Restore, "+ Add item"

## Routes

| Route | File |
|-------|------|
| `/accommodation` | `app/accommodation/page.tsx` → `renderBookings('stays')` |
| `/resources` | `app/resources/page.tsx` → `renderBookings('resources')`; `?category=accommodation` redirects to `/accommodation` |
| `/amenities` | `app/amenities/page.tsx` → `renderBookings('amenities')`: Amenities & tools. With the v4 look, `/accommodation` and `/resources` redirect here |
| `/admin/bookings` | `app/admin/bookings/page.tsx` → `renderBookings('amenities', …, { admin: true })`: only the requests and the inventory, for admins and circle leads |

Query params: `tab=browse|mine|manage`, `category=accommodation|tools|spaces`, `item=<id>` (opens the pop-up).

## Files

| File | Purpose |
|------|---------|
| `BookingsClient.tsx` | Page: tabs, filters, book / cancel / approve, item save and archive |
| `AmenitiesMap.tsx` | The Amenities map (v4.43.0): the picture of the land (`community_settings.site_map_url`) with a pin per item (`map_x`, `map_y`, percent); `placing` turns a click into a pin (Admin › Bookings › Map). Since v4.70.0 a thin wrapper over the shared `core/components/v4/SiteMap.tsx`, which the Map page (M19) uses too. Since v4.75.0 members browse a list (each item shows the photo of the place its pin sits in) and the one map is `/map`. Since v4.76.0 an item can have its own photo (`photo_url`, admins set it in the edit form), shown before the place's |
| `BookingsV4.tsx` | The v4 look's view of the same page (BookingsClient passes its state and actions as `vm`); Admin › Bookings adds the Calendar (who stays where: one strip of days that scrolls sideways, opening on today, v4.112.0) |
| `ItemModal.tsx` | Item details, schedule, booking form, manager actions (with v4, its own view in the shared building blocks) |
| `ItemFormModal.tsx` | Add/edit item: category, tags, circle, capacity, approval toggle (with v4, its own view) |
| `StayCalendar.tsx`, `stay-calendar.css` | The availability calendar and the price box in an accommodation's pop-up (decision #108) |
| `lib/pricing.ts` | `stay_prices` → rates, the community's `STAY_RULES` (config `"stays"`), and `estimateStay`: the one place the arithmetic lives |
| `lib/inventory.ts` | Categories, status labels, permission helpers, formatting, error messages |
| `lib/queries.ts` | `ITEM_SELECT`, `BOOKING_SELECT`, row normalizers |

## Database tables

Migration: `supabase/migrations/20261101_m15_bookings.sql` (repo root).

| Table | Access |
|-------|--------|
| `booking_items` | Read: active items for everyone, archived for admins/circle leads. Insert: admin, or circle lead with no circle / a circle they lead. Update/delete: `private.can_manage_item()` — admin, or circle lead when the item has no circle, is in their circles, or they added it |
| `bookings` | Read: own bookings, or everything for joining+. Insert: joining+ for themselves. Update: booker (cancel only) or item manager |

- `bookings_no_overlap` — exclusion constraint (btree_gist): pending/confirmed bookings of one item can't overlap. Error code `23P01`.
- **Only admins approve** — `booking_items.admins_approve` (set by admins in the Edit form). When on, only an admin approves, declines or changes other people's bookings of that item, and only an admin changes the switch or "needs approval" (`booking_items_guard` trigger). A circle lead who manages it still edits the item. `canDecideItem()` in `lib/inventory.ts` mirrors it.
- `bookings_guard` trigger — sets status on insert from `requires_approval` (pending vs confirmed; the client's value is ignored), blocks bookings of archived items, lets non-managers only cancel, stamps `decided_by` on approve/decline.

## Prices

- `booking_items.stay_prices` (jsonb): `{ "night": 70, "week": 490, "month": 1700, "two": { … } }`, before tax; every key optional. Set in the item's Edit form. Migration `20261230000000_stay_prices.sql`.
- The community's rules are config, not code: `"stays": { currency, vatPercent, longStay: [{ months, percent }], notes: [] }` in `instance/config.jsonc`.
- `estimateStay`: whole months at the monthly rate, whole weeks at the weekly, then nights; a few nights never cost more than a week, nor the rest of a stay more than a month; the long-stay discount counts whole months; tax goes on last. The result is shown as an estimate and stored nowhere.
- `bookings.guests`: how many people. Read on its own (like photos and prices), so the page works before the migration.
- Not in the second brain yet (follow-up: a note per place with its prices).

## Gotchas

- One row = one bookable thing. Five identical bikes are five items (tag them `bike`).
- Accommodation ranges are local midnight → midnight with `[)` bounds, so back-to-back stays don't clash.
- No notifications yet: leads see pending requests in the Manage tab and the badge count.

Since v4.110.0 there can be more photos after the cover (`photos`, text[]): shown as a swipe strip (`core/components/PhotoStrip.tsx`). Editing them in the forms is still to do.
