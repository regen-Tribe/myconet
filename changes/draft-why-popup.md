---
bump: minor
title: Why a draft is suggested, in a small pop-up
public: A draft from a meeting has a Why? link on its "From …" line in Drafts to confirm. It opens a small window over the page with what was said and by whom, the meeting and its date, what the meeting was about, and the project manager's reasons, so you don't have to leave the page.
---
Oscar: "on the drafts to confirm section, on the operations page - when im looking at a draft - id like to be able to
see a simple pop up that shows why this is being suggested with out taking me to another page". `DecisionList` (M07):
a **Why?** button on a row's source line opens `ModalShell` in a portal with the task, the action item's text and its
speaker, the meeting (title and date), the meeting's `summary` (read from `meeting_transcripts` when the pop-up opens,
cut at 900 characters) and the reasons of any suggestion on the task. A link to the meeting's notes stays at the bottom
for whoever wants it. No migration.
