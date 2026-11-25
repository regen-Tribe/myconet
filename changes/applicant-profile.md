---
bump: minor
title: Stewards see what the applicant told us
public:
  - In Admin › Applications, an application shows the person's answers from About you, with a link to their profile.
  - The filter at the top of Applications shows which one is chosen.
  - After sending your application, the top of Start joining says "Back to Dashboard".
---
Found in Sonia's live test of the two-step join (decision #93): with no Blueprint questions, an application showed only a
name. `applications-server.ts` now loads each applicant's line, About, photo, place, what best describes them, skills,
interests, values, offers and requests (`profile_details()` for place and kinds, as #71 allows stewards); `JoinAdminClient`
shows them above any written answers, with "Open their profile →". The filter row uses the shared `Chip` (the chosen one
was white on pale). `FocusShell` says "Back to Dashboard" once every join step is done. No migration.
