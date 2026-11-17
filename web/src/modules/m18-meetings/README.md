# M18 — Meetings (optional)

Built by Sonia for Protopia (Nov 16). Meeting recordings are transcribed and summarised by
[Fireflies.ai](https://fireflies.ai); the notes (summary, action items by person, transcript) show at
`/meetings`. **Off unless the community turns it on** in `instance/config.jsonc`: `"modules": ["meetings"]`.

## Two ways in

1. **Upload** (`/meetings/upload`, joining members and above): the browser puts the audio in the private
   `meeting-audio` bucket under the person's id → `/api/meetings/upload` records the meeting
   (`status: processing`) and sends Fireflies a 2-hour signed link → Fireflies calls
   `/api/fireflies-webhook?key=FIREFLIES_WEBHOOK_SECRET` when done → the row gets the summary,
   action items and transcript (`status: done`, or `error`).
2. **Recorded in Fireflies directly**: Fireflies' webhook calls
   `/api/fireflies-ingest?key=PROTOPIA_INGEST_SECRET` → a new row with `source: fireflies_direct`,
   `needs_review: true` (skipped if that Fireflies id is already in).

## Secrets (Cloudflare, `npx wrangler secret put …`)

`FIREFLIES_API_KEY`, `FIREFLIES_WEBHOOK_SECRET`, `PROTOPIA_INGEST_SECRET` (the ingest key; the name is
historical), `SUPABASE_SERVICE_ROLE_KEY` (the webhooks write with it: `core/lib/supabase/service.ts`).

## Files

| File | Purpose |
|------|---------|
| `MeetingsList.tsx`, `MeetingDetail.tsx`, `UploadForm.tsx` | The three pages' UI |
| `lib/fireflies.ts` | Fireflies GraphQL: `uploadAudio`, `fetchTranscript`, transcript text, action-item parsing |
| `lib/access.ts` | Pages: module on + joining or above |
| `app/meetings/**`, `app/api/meetings/upload`, `app/api/fireflies-webhook`, `app/api/fireflies-ingest` | Routes |

## The meeting pipeline (v4.21.0)

When a meeting's notes are in **and it has a circle**, `lib/pipeline.ts` (service role) runs:

1. **Tasks on the board, as drafts.** `lib/draft-tasks.ts` (MiniMax M3.1-Flash, low reasoning) reads Fireflies'
   action items, the summary and the transcript (first 40k characters), plus the circle's open projects and
   open tasks. It writes one task per agreed piece of work, with the person, a date/time if one was said
   (relative to the meeting day, in `COMMUNITY_TIME_ZONE`), and the best-matching open project, or `null` for
   the circle's **Chores** (routine upkeep). It skips what's already on the board, and adds what was clearly
   agreed but missed by Fireflies. Without the AI (no key, over the time budget, unreadable answer) Fireflies'
   action items go on as they are. Tasks get `source='meeting'`, `source_meeting_id`, `source_item`,
   `needs_review=true` (the Draft badge).
2. **People:** `lib/people.ts` matches the name to a member (full name, username, a first name only one
   member has). No match is normal (not everyone has an account): the task keeps "(for Name)" in its title
   and no assignee, and the email lists them as "not on MyCoNet yet".
3. **No duplicates:** `meeting_action_links` (meeting + normalised title) is claimed before each task is
   written, so a re-run or a repeated webhook adds only new tasks.
4. **Second brain** (`lib/second-brain.ts`): `operations/meetings/YYYY-MM-DD <title>.md` in `knowledge.repo`,
   committed by "MyCoNet agent" through the GitHub API (`SECOND_BRAIN_GITHUB_TOKEN`): front matter (circle,
   `visibility: members|circle`), who was there, the summary, the tasks with links. **Never the transcript.**
5. **Email** (`lib/notes-email.ts`, based on Sonia's; `lib/smtp.ts` is hers unchanged): to the **leads of the
   meeting's circle at the email on their account**, plus `meetings.notesEmail.alwaysTo` usernames. Not to
   outside attendees. Once automatically; "Email the notes again" sends again.
6. **Log:** every task, note and email in `agent_actions` (admins read it).

**When it runs:** uploads with a circle → right after Fireflies' webhook (`after()`, a 20 s AI budget, since
waitUntil lasts about 30 s). Uploads without a circle and direct Fireflies recordings (`needs_review`) → when a
lead sets the circle on the meeting page ("Save and put tasks on the board"). Leads can also run it again
("Look for new tasks again"), confirm all drafts, and email again: `POST /api/meetings/[id]` with
`action: settings | process | email | confirm` (admins, circle leads, project leads).

**Who reads meetings:** joining members and above, as before, except **Circle only** meetings
(`visibility='circle'`): only that circle's members (its teams in /org), its leads and admins
(`private.in_circle()`, restrictive RLS).

**Where people find them:** `/meetings` (circle chips, *My circles*, *All*, search, *Needs review* for leads;
`?circle=<slug>|mine|all`), a **📝 Meeting notes (N)** button on each circle in `/org` and in Operations ›
Circles, and a "📝 From a meeting" link in a task's pop-up. The board gets a **Drafts** card that opens the
Deliverables tab filtered to drafts.

## Settings (instance/config.jsonc)

```jsonc
"timeZone": "America/Costa_Rica",
"knowledge": { "repo": "owner/second-brain", "branch": "main" },          // + SECOND_BRAIN_GITHUB_TOKEN
"meetings": { "notesEmail": { "from": "x@gmail.com", "smtpHost": "smtp.gmail.com", "smtpPort": 465, "alwaysTo": [] } }  // + MEETINGS_SMTP_PASSWORD
```
Each part is off until its settings and secret exist. SMTP needs the Worker runtime (`cloudflare:sockets`):
under `next dev` a send reports an error.

## Database

Migration `supabase/migrations/20261121000000_meetings.sql`: `meeting_transcripts` (read: joining members
and above; writes through the server routes) and the private `meeting-audio` bucket (each person's own folder).
Migration `20261124000000_meeting_pipeline.sql`: meeting `visibility` + pipeline columns, `private.in_circle()`
and the Circle-only policy, `meeting_action_links`, `agent_actions`, `chores_project_for_server()` (service role).
