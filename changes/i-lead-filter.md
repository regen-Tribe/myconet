---
bump: patch
title: "I lead" shows the same in both board views
public: The board's "I lead" filter now shows everything in the circles you lead, plus any task you lead or created, in both Tasks and All subtasks. Before, Tasks only showed tasks you led or created yourself. Admins see everything.
---
Oscar asked what "I lead" showed. In Tasks (project cards) it kept only projects with `lead_user_id` or `created_by` = you,
skipping the circles you lead; in All subtasks it also kept your circles. `OpsClient` (M07): both now keep a card when you
are an admin, its circle is one you lead (`lead_circles`), or you lead or created its task. No migration.
