---
bump: patch
title: A decided draft stays decided when you fold its meeting
public: When you fold a meeting's drafts and open them again, the ones you approved or declined still say so, with Undo.
---
Oscar: "I just declined two suggestions in Vision circle… and when I collapse the row they turn back to draft". The
decisions were saved: the declined tasks were gone and the confirmed ones confirmed. Only the label came back. Folding a
meeting's group in Drafts to confirm / To decide unmounts its rows, and the Draft pill (`DraftSwipe`) kept what was
decided in its own state, so a row drawn again started as "Draft".
- The list (`DecisionList`, and the List's drafts in `DeliverablesTab`) keeps each pill's decision, Approved or
  Declined with the log entry Undo needs, and hands it back through a new `decided` prop. A row drawn again reads
  "Approved · Undo" or "Declined · Undo" until the page is reloaded.
- `onDeclined` now passes the decline's log id.

No migration.
