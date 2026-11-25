---
bump: patch
title: Declining a draft lowers the count
public: When you slide a Draft pill left to decline it, the count of drafts at the top of Drafts to confirm goes down straight away (and back up if you Undo).
---
Oscar: "when I decline something by sliding the pill left, on drafts to confirm, the count on the top row holding
the suggestions should decrease". The panel head (`ToDecidePanel`, M07 `DecisionList.tsx`) counted drafts from the
rows it was loaded with, so a pill slid in the list below never reached it. `DecisionList` now takes `onPill` and
tells the panel when a pill is approved, declined or undone; the head leaves those out of its count. Each meeting
group's own count also leaves out declined drafts (approved ones already dropped). No migration.
