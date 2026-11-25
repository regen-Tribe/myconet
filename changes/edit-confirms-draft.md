---
bump: minor
title: Any edit to a draft confirms it
public: Changing a draft anywhere (moving it on the board, changing its status on a project's page, or marking your own task done) now confirms it, so the Draft pill goes away. Before, some of these left it showing.
---
Oscar: "any time a task is edited, it should lose the draft pill", after "Resolve the Micronet email-link issue" showed Done
and Draft together. Dragging a card on the board (`OpsClient`), changing a status on a project's page
(`ProjectDetailClient`) and the assignee's own update (`update_my_task`) changed the task but kept `needs_review`; the Edit
fields, the task window and the assistant already cleared it.
**Migration `20261228000000_edit_confirms_draft.sql`**: a `before update` trigger on `deliverables` clears `needs_review`
when a signed-in person changes the title, status, circle, subcircle, parent, person, priority, due date or time, notes
or progress of a draft. Service-role work (the meeting pipeline, the board review) doesn't count, and an update that sets
`needs_review` itself (approve, Undo, Later) is kept. Tested on RTRN in rolled-back transactions. The board and the
project page also drop the pill at once. Existing tasks that are already Done and still a Draft keep their pill until
someone edits or approves them.
