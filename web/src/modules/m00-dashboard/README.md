# M00 — Dashboard

Community heads-up display. Shows live community stats, module entry points, and a recent activity feed. Accessible to all visitors — logged-out guests see public community data; logged-in members see their personalised view.

## What users see here

- **Community stats** — member count, blueprint readiness score, active projects, open proposals
- **Module grid** — one card per module (M01–M09) with a short description and lock state based on role
- **Activity feed** — recent member joins, new projects, new governance proposals
- **Next step card** — shown to Explorers and Joining members, guiding them toward full membership
- **Guest view** — non-logged-in visitors see community stats + "Join the community" / "Sign in" CTAs instead of a personalised greeting

## Routes

| Route | File |
|-------|------|
| `/dashboard` | `app/dashboard/page.tsx` → `modules/m00-dashboard/DashboardPage.tsx` |

## Files

| File | Purpose |
|------|---------|
| `DashboardPage.tsx` | Server Component — all data fetches + full render (stat cards, module grid, activity feed) |

## Database tables

| Table | Access |
|-------|--------|
| `user_profiles` | Read — display name, role, member count, recent members |
| `blueprints` | Read — community blueprint readiness (public data, no auth required) |
| `projects` | Read — active project count, recent projects |
| `proposals` | Read — open proposal count, recent proposals |
| `applications` | Read — logged-in user's join application status |

## Role gating

| Role | Experience |
|------|-----------|
| Guest (not logged in) | Public community stats + join/sign-in CTAs |
| Explorer | Full dashboard + "next step" card pointing to M05 Join |
| Joining | Full dashboard + "next step" card if application pending |
| Member+ | Full personalised dashboard |

Module cards for M06–M09 render as locked (greyed, 🔒 badge) for Explorer role. All module cards are links for Member+.

## Data architecture

Public data (member count, projects, proposals, blueprint) is fetched unconditionally. User-specific data (profile, application) is fetched only when `user` is non-null, keeping the page fast for guests and avoiding errors on null user.

## How to work on this module

```bash
cd web && npm run dev
# http://localhost:3000/dashboard
```

Key imports:
```ts
import { createClient } from '@/core/lib/supabase/server'
import { computeOverallReadiness, computeGatesPassed, computePhaseProgress } from '@/modules/m04-blueprint/lib/blueprint-compute'
```

To add a new stat card, add the Supabase query to the `publicFetches` Promise.all block and render a `<StatCard>` in the grid.
