---
bump: minor
title: A task opens over the list you're on
public: Clicking a task in Drafts to confirm (or in a meeting's action items) opens its window over the page you're on, instead of taking you to another page. Cmd- or Ctrl-click still opens the task's own page.
---
Oscar: "when I click on a task in the drafts to confirm section, id like the pop up to happen with the existing screen in
the background. Currently its taking me to another page". `DecisionList` (M07) catches a plain click on a row's title,
loads the task (the board's select) and opens `TaskModal` in a portal over the page. Cmd/Ctrl/Shift-click and middle-click
still follow the link. Saving updates the row and remounts its Edit fields; saving a draft in the window confirms it, so
its pill reads Approved and the Drafts to confirm count drops, as with a slide right. Deleting the task removes the row
and takes it out of the counts. No migration.
