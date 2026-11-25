---
bump: minor
title: Start joining like a phone app, with clean pills
public:
  - On a phone, each step of Start joining fills the screen, with Back and Continue always in reach at the bottom.
  - Pills are softer and borderless; a picked one turns dark with a check.
  - Fewer words: only what helps you answer.
---
Sonia's phone test (decision #96). `join-review.css`: under 640px, inside a step the heading is one line, the track compact,
the card fills the screen and `.jf-nav` is a sticky bottom bar (safe-area aware). `pill-picker.css`: no borders or outlines;
soft fills; picked = ink. "What best describes you?" uses pastel pills (`.pp-pill`) in Start joining, Edit profile and
`/design`. Cut hints that repeat the question. No migration.
