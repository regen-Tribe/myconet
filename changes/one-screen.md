---
bump: patch
title: Each step of Start joining fits your phone screen
public:
  - On a phone, each step of Start joining fits the screen; the page doesn't scroll.
  - The city picker stays still while you type.
---
Sonia (decision #102). `join-review.css`: under 640px inside a step, `.fx` is 100dvh with no page scroll; the step's content
scrolls inside its card between the title and the button bar; "Start joining" and the eyebrow hide; values rows shorter.
`pill-picker.css`: groups two across on a phone. `HomePicker`: loads the list on focus and scrolls the field into view once,
instead of on every keystroke. No migration.
