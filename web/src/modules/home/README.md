# Home Portal

The community's public and member-facing home page for the community (its name comes from `instance/config.jsonc` and the Blueprint's working name, via `core/lib/instance.ts`). Shows live data from all modules and adapts to the viewer's role. Also serves as the main onboarding experience for new and prospective members.

## What users see here

- **Hero** — community name, purpose text (from blueprint), and 8 module pills that smooth-scroll to each section
- **Module pills** — M00–M09 pills with icon, short description, and 1600 ms ease-in-out scroll to the matching section below
- **"Take the tour" button** — smooth-scrolls to the M00 Dashboard preview section
- **Dashboard preview (M00)** — live stat cards (members, projects, deliverables, blueprint progress) + active projects + recent deliverables feed
- **Members (M01)** — recent member avatars with match scores for logged-in users
- **Blueprint (M04)** — phase progress bars with readiness score
- **Values / Join (M05)** — community values list with signing status
- **Agreements (M06)** — open projects available for collaboration
- **Operations (M07)** — active projects and deliverable feed
- **Contributions (M08)** — contribution points and badge system overview
- **Governance (M09)** — four-layer governance model explainer with live open proposals count

## Routes

| Route | File |
|-------|------|
| `/home` | `app/home/page.tsx` → `HomePage` (server) → `HomeClient` (client) |

## Files

| File | Purpose |
|------|---------|
| `HomePage.tsx` | Server Component — all cross-module data fetches, passes as props to HomeClient |
| `HomeClient.tsx` | Client Component — renders every section; contains `ModulePill`, `smoothScrollTo`, and all section sub-components |

## Data fetched in `HomePage.tsx`

| Source | Data |
|--------|------|
| `blueprints` | Community purpose text (shown in hero), phase progress, readiness score |
| `user_profiles` | Member count, recent members for M01 section |
| `community_values` | Community values list for M05 section |
| `projects` | Active projects for M06/M07 sections |
| `deliverables` | Recent deliverables feed |
| `user_bio` | Match scores for logged-in user |
| `applications` | Whether viewer has already applied |
| `user_achievements` | Awards `community_joiner` badge on first home visit with joining+ role |

## Community purpose text

The hero lead paragraph comes from `blueprints.answers.purpose`. Editing the community blueprint updates the home page automatically — no code change needed.

## Role-adaptive content

| Role | Experience |
|------|-----------|
| Guest (not logged in) | Full portal in read-only view; match scores hidden; sign-up CTAs in relevant sections |
| Explorer | Full portal + "Start joining" nudge in M05 section |
| Joining | Full portal + joining reward banner on first visit |
| Member+ | Full portal with live match scores on member avatars |

## Module pills — smooth scroll

`ModulePill` is a client component using React `useState` for hover state and a shared `smoothScrollTo(targetId)` function that scrolls the `<main>` container (not `window`) with a 1600 ms ease-in-out animation. The same function powers the "Take the tour" button.

Section IDs:
| ID | Module |
|----|--------|
| `clubhouse` | M00 Dashboard preview |
| `meet` | M01 Network |
| `blueprint` | M04 Blueprint |
| `join` | M05 Join |
| `agreements` | M06 Agreements |
| `ops` | M07 Operations |
| `contributions` | M08 Contributions |
| `governance` | M09 Governance |

## How to work on this module

```bash
cd web && npm run dev
# http://localhost:3000/home
```

To add a new section:
1. Add the data fetch to `HomePage.tsx`
2. Add a section `<section id="your-id">` in `HomeClient.tsx`
3. Add a corresponding `ModulePill` entry in the pill array (with matching `target` ID)

Keep `HomePage.tsx` as a thin data layer — all rendering belongs in `HomeClient.tsx`.


## Community at a glance

`CommunityGlance.tsx` renders tiles on `/` (landing) and `/home`. Text comes from the community blueprint's answers via `lib/at-a-glance.ts` (`buildGlanceTiles`): each tile tries a list of answer keys in order, takes the first sentence, trims to ~170 chars, and is skipped if empty. Edit the tile list there; edit the wording in the Blueprint.
