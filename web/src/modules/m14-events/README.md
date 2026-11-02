# M14 — Calendar

The community calendar (labelled "Calendar" in the UI; route `/events`, with `/calendar` redirecting). Three calendars side by side:

- **Core events** — official events, posted by full members, circle leads, project leads, advisors and admins
- **Community hosted** — events anyone joining or above can post
- **Tasks** — things the community needs done; same posting rule as core. RSVP reads "I'll help" / "Who's helping" (`KIND_META` holds the wording)

## What users see here

- **Month / Week / List views** with Today and prev/next navigation; List has Upcoming and Past
- **Circle filter** and color coding by circle (no circle = module teal)
- **Event pop-up** — when, where, online link, description, linked project/proposal, RSVP (Going / Maybe) and who's coming, edit/delete for those allowed
- **Event form** — title, calendar (core is locked with an explanation for joining members), start/end or all-day, location, online link, description, circle, Ops project, Governance proposal, public toggle
- Logged-out visitors see public events only, and no RSVP names

## Routes

| Route | File |
|-------|------|
| `/events` | `app/events/page.tsx` → `EventsClient` |

Query params: `tab=core|community|task`, `view=month|week|list`, `event=<id>` (opens the pop-up), `new=1&project=<id>&proposal=<id>&circle=<pillar>` (opens a pre-filled form).

## Files

| File | Purpose |
|------|---------|
| `EventsClient.tsx` | Page: tabs, toolbar, view switching, save/RSVP/delete |
| `CalendarViews.tsx` | `MonthView`, `WeekView`, `ListView`, `eventColor()` |
| `EventDetailModal.tsx` | Event pop-up + shared `ModalShell` |
| `EventFormModal.tsx` | Create/edit form |
| `LinkedEventsList.tsx` | Upcoming events for another module's page (used on `/ops/[id]`) |
| `lib/calendar.ts` | Local-time date math and formatting — call after mount only |
| `lib/permissions.ts` | `canCreateKind`, `canEditEvent` — mirror the RLS policies |
| `lib/queries.ts` | `EVENT_SELECT`, `RSVP_SELECT`, row normalizers |

## Database tables

Migrations: `supabase/migrations/20261101_m14_events.sql`, `20261102_m14_event_tasks.sql` (repo root).

| Table | Access |
|-------|--------|
| `events` | Read: public events for everyone, all events for joining+. Insert: community = joining+, core and task = full member+. Update/delete: host, admin, or circle lead of the event's circle |
| `event_rsvps` | One row per (event, user), status `going`/`maybe`. Signed-in users read; each user writes only their own |

Policies use `private.my_role()` / `private.my_lead_circles()` (security definer, not exposed over the API).

## Gotchas

- Dates render in the viewer's time zone, so the calendar waits for mount; the server renders in UTC.
- The page loads events from the last 365 days onward. Older events need a fetch on navigation if that ever matters.
- Not in v1: recurring events, .ics export, an events section on the proposal cards in M09.
