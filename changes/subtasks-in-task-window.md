---
bump: minor
title: Add subtasks from a task's window
public: A task's window (from the board or Drafts to confirm) has a Subtasks box. Add a subtask, and a task on its own becomes a bigger task with its own page, holding this task and the new subtask. For a task that's already a subtask, new ones go beside it in its bigger task.
---
Oscar: "when I open a task in the operations page, draft confirm section, id like to be able to add a subtask to the task
pop up page that opens when I am editing a task". Only a project (a "bigger task") holds subtasks, so — Oscar's choice —
`TaskModal` (M07) gets a **Subtasks** section for those who may edit the task. For a task of its own, the first subtask
creates a project from it (its title, notes as description, circle, subcircle, due date as deadline, its person as lead or
else the one adding; status backlog), files the task under it, then adds the subtask: the same shape as accepting the
project manager's new_project suggestion. For a subtask, new ones go into its project. The window stays open (a list of
what was added, a link to the new page, "Part of" now showing it) and the page refreshes behind it. Moving a draft
confirms it (edit_confirms_draft). Tested on RTRN as a circle lead in a rolled-back transaction. No migration.
