---
bump: minor
title: Circle leads can change who leads their circle
public: On a circle's page, admins and that circle's leads can now add a lead (+ Add lead) or remove one (Remove on the lead's card). A member made a lead becomes a circle lead; a circle always keeps at least one lead unless an admin removes it.
---
Oscar: "add the ability for admin and circle leads to edit the circle lead list". Until now only an admin could, in
Admin › Permissions (`guard_profile_privileges` refuses role / `lead_circles` changes by anyone else).
**Migration `20261229000000_set_circle_lead.sql`**: `public.set_circle_lead(p_user, p_circle, p_lead)`, security definer,
for signed-in people only. The caller must be an admin or a `circle_lead` of that circle. Adding: only a `member` or
`circle_lead` (others are changed by an admin in Permissions); a member becomes `circle_lead`. Removing: the circle comes
off, and with none left the person goes back to `member`; a lead (not an admin) can't remove the circle's last lead. The
existing `leads_are_members` trigger keeps circle membership in step. Tested on RTRN in a rolled-back transaction (8
cases). UI: `CircleLeadsEditor.tsx` (M17), used in the circle page's Leads section (`CirclesV4.tsx`); the page reloads
its lead list after a change.
