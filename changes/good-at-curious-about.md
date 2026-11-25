---
bump: minor
title: Good at, curious about: one picker, and a profile in seven tabs
public:
  - Pick what you're good at and what you're curious about from groups of pills, with suggestions as you go.
  - Skills you're happy to share become your offers, so joining asks each thing once.
  - About you in Start joining is three short screens, with "What best describes you?" and your values as names.
  - Profiles and Edit profile have the same seven tabs; personality and signs are one tab, links another.
  - Matches now say when someone is good at what you're curious about.
---
Sonia, 25 Nov (Protopia join questions): people reach MyCoNet after the community's own website form, so
joining asks only about you, each thing once. Design review only (`designReview`); communities without it keep
the old pages. Decisions #89–#92 in `design/decisions.md`; words in `LEXICON.md`.

- `core/lib/skills-interests.ts`: twelve groups of pills, shared by skills and interests; suggestions from what
  people here pick together; "What best describes you?" words; values as names (`valueList`).
- `core/components/v4/PillPicker.tsx` (+ `pill-picker.css`): groups first, then pills; your own; share → offers.
- `m05-join/JoinReview.tsx`: About you as three screens (`?step=profile&part=2`), each saved on Continue.
- `m01-network/ProfileReview.tsx` and `app/profile/edit/page.tsx`: the same seven tabs.
- `m01-network/lib/match-score.ts`: a skill meeting a curiosity (up to 10) and the same group (up to 3).
- Blueprint: the values prompt asks for "Name — two or three sentences" per line; Community values' fields are
  Name and What it means; About splits a values answer on lines when it has them.

No migration, no new secret. Stored as before: `user_bio.skills`, `interests`, `values_principles` (one name per
line), `user_profiles.user_types`, `user_offers`, `user_requests`.
