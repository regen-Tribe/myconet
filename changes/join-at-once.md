---
bump: minor
title: Joining at once, in six short screens (communities that turn it on)
public:
  - A community can make joining its portal instant: Welcome, then six short screens that each fit one phone screen, and you're in, with no application to wait on.
  - On "You're in" you choose yourself whether other members see you. Members, search and the counts show only people who said yes.
  - Who invited you is read from their invite link, and "Invite someone" copies your own.
---
Sonia, 28 Nov 2026 ("ok, build it - remember that onboarding and wizard should be mobile optimized and vp size - do not
overwhelm with info"), step 1 of Protopia's "Coming to Protopia" plan. Behind a new switch, `"joinAtOnce": true` in a
community's config (off for everyone else), on top of the design review. Decision #107; words in `LEXICON.md` › Joining.

- `/join` becomes the first onboarding (`m05-join/JoinNow.tsx`, `JoinNowPage.tsx`, `join-now.css`): Welcome · Sign up ·
  Check your email · A photo and one line · What are you up to in this world? · A bit more about you · You're in.
  Phone first: each screen is exactly the screen's height, one main button, "Skip for now" from the photo on.
- Finishing calls `join_now()`: explorer → joining member, only where `community_settings.join_at_once` is on.
- "Show me to other members" is `user_profiles.show_to_members`, the person's own (a trigger lets only them change it).
  `core/lib/listed.ts › LISTED` replaces `.eq('approved', true)` on Members, search and counts; with the switch off it
  is the same filter as before.
- `user_profiles.invited_by` is filled at sign-up from `/join?invite=<username>` (a trigger reads the account's
  metadata); only an admin can change it. The same trigger keeps the last name typed at sign-up.
- An address that's already known (a guest an admin added) gets a set-password link instead of "already registered";
  setting the password claims the profile and the onboarding carries on. `join_now()` also marks a claimed profile
  approved, so listing is then the person's own choice.
- `/auth/signup`, `/` for visitors, the confirmation link and the Dashboard's explorer card point to the new flow.

**Migration:** `supabase/migrations/20270101000000_join_at_once.sql` (two columns, two triggers, `join_now()`,
`community_settings.join_at_once`). A community that turns the switch on also sets `join_at_once = true` in its own
migration. Apply before deploying: with the switch on, Members filters on the new column.
