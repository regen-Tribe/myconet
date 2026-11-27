---
bump: minor
title: One New task button, opening the task window over the board
public: Operations has one New task button instead of two. It opens the task window over the board with every field — name, status, person, priority, due date, circle, subcircle, part of, notes — and Add task saves it. Leave "Part of" empty for a task on its own, or pick a task to make it a subtask. A link in the window still starts a bigger task with its own page.
---
Oscar: "when we click add a new task button or task of its own, it should just be one button of new task and it should
open a pop up over the current screen with that task and all fields that can be edited for it". `OpsClient` (M07): the
v4 header's "Task of its own" and "New task" (→ /operations/new) become one **New task** that opens `TaskModal` in a new
mode (an empty task, `id: ''`): the same fields as editing a task, starting in the board's chosen circle and subcircle;
it inserts the task (progress 0) instead of updating, has no Delete or Watch, and saves with **Add task**. A line under
the fields explains Part of and links "Start a bigger task →" (/operations/new) for a task with a description and its own
page. The old look (design not v4) keeps its two buttons and `NewTaskModal`. No migration.
