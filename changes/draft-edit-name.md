---
bump: minor
title: Rename a task right where you edit it
public: A task's Edit fields in Drafts to confirm (and a meeting's action items) now start with its Name, so you can reword a suggested task. It saves when you click away or press Enter; Escape puts the old name back.
---
Oscar: "I want to be able to edit the name of the task that is being suggested in the drafts to confirm edits".
`TaskQuickEdit` (M07) gets a Name box above the fields. It saves `deliverables.title` on blur or Enter, if changed and
not empty (an empty name goes back to the old one); Escape restores it. Like every field there, saving confirms a
draft. `TaskChange` and `EDITABLE_SELECT` (`lib/task-edit.ts`) carry `title`, and the row's title follows the save. No
migration.
