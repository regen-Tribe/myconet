---
bump: minor
title: Start joining, one question per screen
public:
  - About you asks one question per screen, so each fits your phone; Back and Continue sit at the bottom like an app.
  - Step 1 lists the values as names; tap one to read it.
  - Softer, rounder cards and buttons, with a few pastel touches.
---
Sonia, 25 Nov (decisions #99, #100). `JoinReview`: About you is seven screens (`PARTS`, `LAST_PART`), each saving its
own answer; the title is the question (`PillPicker hideLabel`). Step 1's values fold (`<details>`). `focus-shell.css`:
Sponic's feel (18px cards, soft shadow, 48px buttons and fields) in MyCoNet's colours, pastel value numbers and photo
placeholder. `join-review.css`: on a phone the step card is a flex column so the button bar sits at the bottom. No migration.
