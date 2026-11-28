---
bump: patch
title: Joining asks "What are the areas you have experience with?"
public:
  - Joining and Edit profile ask "What are the areas you have experience with?" instead of "What are you good at?".
  - Joining asks it once: the extra "Happy to share any?" row is gone. Offers are added in Edit profile.
---
Sonia (27 Nov): "\"happy to share any?\" not clear what this means, seems like too much", and "\"what are the areas
you have experience with?\" replaces what you're good at" (decision #104). Start joining's fourth About you screen
has the new title and no share row; its picks are saved to `user_bio.skills` only, and joining no longer creates or
removes `user_offers` rows (`modules/m05-join/JoinReview.tsx`, `app/join/page.tsx` no longer loads offers). Edit
profile uses the same question and keeps its share row, so offers still come from skills there. Words in
`LEXICON.md`, `design/decisions.md` #104. No migration.
