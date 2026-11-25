---
bump: minor
title: Pick your home town from a list, and add more than one
public:
  - "Where do you call home?" suggests towns as you type; pick one, or keep what you typed.
  - You can add more than one place.
---
Sonia, 25 Nov (decision #97). `HomePicker` (core/components/v4) over GeoNames' cities15000 (CC BY 4.0, credited under the
field), served from our own `/places/towns.json` (built by `scripts/build-towns.mjs`), loaded when the field is first used.
Up to five places, kept in `user_profiles.city` / `country` paired with " · " (`core/lib/homes.ts`): no migration. Used in
Start joining and Edit profile; profiles and Admin › Applications show "Lisbon, Portugal · Barcelona, Spain"; matching
compares each place. Also from the screen-by-screen run: suggestions scroll above the phone's bottom bar, shorter
placeholder and screen title.
