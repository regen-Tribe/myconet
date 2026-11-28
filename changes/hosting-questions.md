---
bump: minor
title: Edit profile asks what brings you, daily work, experience, ideas, diet and allergies (communities that host people)
public:
  - A community that hosts people can turn on a "You and <community>" tab in Edit profile: what brings you, your daily work, your experience with work exchange, farms or communities, ideas you'd like to start (each one can become a task idea on the board), and your diet and allergies.
  - "Keep me posted" (news and events by email) is a box on Edit profile's Links tab.
  - Diet and allergies are private: only you, admins, the people who host guests and the kitchen read them.
---
Sonia, 28 Nov 2026 ("Coming to Protopia", step 2; Protopia first). Behind a new switch, `"hostingQuestions": true`,
which needs the design review; off for every other community.

- Edit profile (`web/src/app/profile/edit/page.tsx`): a **You and <community>** tab after Offers and requests, three
  pastel groups, one open at a time (`modules/m01-network/HostingQuestions.tsx`, `hosting-questions.css`), and
  **Keep me posted** on Links. Phone first: one line of help at most per question, nothing that scrolls sideways.
- An idea's "Suggest as a task" adds it to the board's Ideas (`projects`, status `pending`, as "Suggest a task"
  does) and links it from the idea. Explorers see "Suggest them as tasks once you've joined".
- "Still to add", your profile's next step and the menu's "Finish your profile" count four more checks (what brings
  you, daily work, diet and allergies, experience): `m01-network/lib/profile-missing.ts`, `core/lib/profile-completion.ts`.
- Answers shared by the profile and, later, a stay request: `core/lib/hosting-questions.ts`.
- **Migration** `20270103000000_profile_questions.sql`: `user_intake` (what brings you, daily work, experience, ideas,
  keep me posted) and `user_food` (diet, allergies), each with its own row-level security; `circles.duties`
  (`hosting`, `kitchen`) says which circle hosts and which cooks, and a community sets it in its own migration;
  helpers `private.hosts_guests()` and `private.reads_food_needs()`. Proven on a local Postgres with fake people:
  `bash supabase/tests/profile-questions-boundary.sh` (37 checks: the person reads and writes their own, admins and
  hosting leads read both, the kitchen reads diet and allergies only, everyone else and visitors nothing).
- Decision #108 (`design/decisions.md`), `LEXICON.md`, `instance.example/config.jsonc`.
