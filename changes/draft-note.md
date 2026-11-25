---
bump: minor
title: A note on a task, right where you edit it
public: When you open Edit on a task in Drafts to confirm (or a meeting's action items), there's now a Note box under the fields. It saves when you click away, and it's the same note you see in the task's window.
---
Oscar: "I would also like to be able to add a note in the area where I can update the fields for suggested tasks".
`TaskQuickEdit` (M07) gets a Note box under the field grid, written to the task's existing `deliverables.notes`
(the same field as the task pop-up's Notes). It saves on blur when the text changed, and, like every other field
there, saving it confirms a draft. `EditableTask`, `TaskChange` and `EDITABLE_SELECT` (`lib/task-edit.ts`) carry
`notes`; the decisions loader (`lib/decisions.ts`) reads it, and `MeetingTask` has an optional `notes`. If the
assistant changes the note, the box is marked like the other fields. No migration.
