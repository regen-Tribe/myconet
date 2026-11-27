---
bump: minor
title: Filter the board by when things are due
public: The Operations board's filters have a Due menu, next to Subcircle, to show only what's due today or within 3, 7, 14, 30 or 90 days. A task card shows when its own deadline, or one of its open subtasks, falls in that range.
---
Oscar: "add a button on the operations filters that says due within (drop down) days - so user can set a range of when
things will be done". `OpsClient` (M07): a **Due** select in the board's filter bar (and the phone's Filter sheet, where it
counts as a filter on the Filter button): Any time · Today · within 3 / 7 / 14 / 30 / 90 days. The range runs from today
to the end of the last day. In All subtasks a card shows when its due date is in range; in Tasks, when the task's
deadline or one of its open subtasks is. Overdue tasks stay under the "late" chip, not in the range. No migration.
