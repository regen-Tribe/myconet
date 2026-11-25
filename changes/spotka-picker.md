---
bump: minor
title: A friendlier skills and interests picker, in pastels
public:
  - Picking what you're good at and curious about now works like Spotka: your picks on top, a search, and a pastel card for each group that opens to its pills.
  - A flame marks what's popular here.
  - "What best describes you?" cards come in soft colours too.
---
Sonia, 25 Nov: "take it as Spotka has it", "popular here should just have a fire emoji", "more pastel colours" (decision
#95). `PillPicker` rebuilt after Spotka's full-size picker (sponic repo, `apps/garden/app/app.js`): Your picks · N with
Review, Search all, one pastel card per group (name, one line, N picked, chevron), one open at a time, a dashed Something
else? Each group has `desc`, `bg` and `line` in `core/lib/skills-interests.ts`; `pastel(i)` tints the describes-you cards.
A `flame` icon (no emoji on screens) marks pills 3+ people have. On `/design`. No migration.
