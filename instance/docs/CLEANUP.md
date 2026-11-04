# MyCoNet Cleanup Checklist

## 🔴 Critical

### 1. Delete duplicate directories from incomplete reorganization
The `core/` + `modules/` reorganization left old directories in place. The v3.20 changelog falsely claims they were removed.

**First — fix imports inside `src/core/components/ui/*.tsx`** (all import `cn` from `@/lib/utils` — must be updated to `@/core/lib/utils` before deleting)

- [x] Update `cn` import in `src/core/components/ui/tabs.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/progress.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/card.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/label.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/badge.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/button.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/dialog.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/skeleton.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/avatar.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/input.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/textarea.tsx` → `@/core/lib/utils`
- [x] Update `cn` import in `src/core/components/ui/select.tsx` → `@/core/lib/utils`

**Then delete the dead duplicates:**
- [x] Delete `src/lib/` (duplicate of `src/core/lib/`)
- [x] Delete `src/components/` (duplicate of `src/core/components/`)
- [x] Delete `src/contexts/` (duplicate of `src/core/contexts/`)
- [x] Delete `src/types/database.ts` (duplicate of `src/core/types/database.ts`)
- [x] Verify build passes after deletion (`npm run build`)
- [x] Update changelog v3.20 entry to reflect that this work is now complete

---

## 🟠 High Priority

### 2. Finish the `resident` → `member` rename (incomplete from last session)

- [x] `src/core/components/shell/AppSideNav.tsx:14` — renamed `const RESIDENT` → `const MEMBER_MODULES`, section label → "Welcome Home"
- [x] `src/core/lib/modules.ts:71` — desc text updated to "member"
- [x] `src/app/LandingClient.tsx` — `const RESIDENTS` → `const MEMBERS`, all user-facing copy updated
- [x] `src/modules/home/HomeClient.tsx` — demo project + body copy updated
- [x] `src/components/AppTopBar.tsx` — fixed when dead duplicate folder was deleted (Item 1)
- [x] `src/app/changelog/page.tsx:134` — left as-is (historical record)

### 3. Centralize role authority logic

Create `src/core/lib/roles.ts` with shared constants and helpers, then update all usages.

- [x] Created `src/core/lib/roles.ts` with `isFullMember`, `isJoiningOrAbove`, `isCircleAdmin`, `isOpsAdmin`, `isAdmin`, `MEMBER_ROLES`, `JOINING_OR_ABOVE`
- [x] Role matrix clarified: `isCircleAdmin` = circle_lead + admin (Blueprint/Join/Agreements); `isOpsAdmin` = circle_lead + project_lead + admin (Ops panel); `isAdmin` = admin only (edit)
- [x] Replace inline arrays in `app/agreements/page.tsx` → `isCircleAdmin`
- [x] Replace inline arrays in `app/ops/page.tsx` → `isOpsAdmin` (circle_lead now has ops admin access)
- [x] Replace inline arrays in `app/ops/[id]/page.tsx` → `isOpsAdmin`
- [x] Replace inline arrays in `app/ops/new/page.tsx` → `isOpsAdmin`
- [x] Replace inline arrays in `app/governance/page.tsx` → `checkFullMember` + `MEMBER_ROLES`
- [x] Replace inline arrays in `app/blueprint/page.tsx` → `isCircleAdmin`
- [x] Replace inline arrays in `app/join/page.tsx` → `isCircleAdmin`
- [x] Replace inline arrays in `modules/home/HomePage.tsx` → `checkFullMember`
- [x] Replace inline arrays in `modules/home/HomeClient.tsx` → `isJoiningOrAbove` + `checkFullMember`
- [x] Replace inline arrays in `core/components/shell/AppSideNav.tsx` → `isFullMember`

### 4. Extract member-promotion logic into a shared helper

The promotion block is duplicated in two server pages and fires on every page load.

- [x] Created `src/core/lib/promotions.ts` with `promoteToMemberIfEligible(supabase, userId, currentRole)`
  - Checks both paths in parallel: accepted agreement OR active project created by user
  - Writes: `user_profiles.role = 'member'` + upserts `community_member` achievement
  - Returns the new role string ('member' if promoted, original role otherwise)
- [x] Replaced promotion block in `app/agreements/page.tsx` → one-liner
- [x] Replaced promotion block in `app/ops/page.tsx` → one-liner
- [ ] (Stretch) Consider a Postgres trigger on `collaboration_agreements.status` change + `projects.status` change as the permanent fix

### 5. Fix the `api/claude` route

- [x] Renamed `/api/claude/` → `/api/scan/`
- [x] Updated caller in `BlueprintClient.tsx` → `/api/scan`
- [x] Updated `m04-blueprint/README.md`
- [x] Removed all verbose `console.log` statements from the route

---

## 🟡 Medium Priority

### 6. Fix race condition in AppSideNav role fetch

Currently shows "Explorer" for ~100–300ms on every page load (flash of wrong state), and has no unmount cleanup.

- [x] Fetch role server-side in `layout.tsx` and pass as prop through `AppShell` → `AppSideNav`
- [x] Removed `useEffect` role fetch and `createClient` import from `AppSideNav`
- [x] `AppSideNav` now initializes `useState` with `initialRole` prop — correct value from first render

### 7. Fix optimistic update ID in AgreementsClient

`AgreementsClient.tsx:384` uses `crypto.randomUUID()` for the optimistic row — doesn't match the real DB ID.

- [x] Change `.insert({...})` to `.insert({...}).select().single()` to get the real ID back
- [x] Use the real `id` in the optimistic update instead of `crypto.randomUUID()`

### 8. Normalize Supabase queries to use joins (reduce N+1)

`app/agreements/page.tsx` (admin branch) does: fetch all agreements → extract IDs → two more queries. Already using join syntax in governance.

- [x] Refactor `agreements/page.tsx` admin query to use embedded `user_profiles(...)` + `projects(...)` join
- [x] Check `app/ops/page.tsx` deliverables + updates queries for similar patterns

### 9. Silence production logs in api route

- [x] Removed all `console.log` statements from `/api/scan/route.ts` (done alongside Item 5 rename)

---

## 🟢 Nice to Have

### 10. Break up large client components

These files are 700–1800 LOC with mostly inline styles — hard to review and hard to maintain.

| File | LOC | Target |
|---|---|---|
| `m04-blueprint/BlueprintClient.tsx` | 1857 | Split wizard steps into sub-files |
| `home/HomeClient.tsx` | 1206 | Extract section components |
| `m06-agreements/AgreementsClient.tsx` | 1055 | Extract ProjectCard, ProposalForm, NewProjectModal |
| `app/LandingClient.tsx` | 748 | Extract section components |
| `m07-ops/OpsClient.tsx` | 730 | Extract ProjectRow, DeliverableList |
| `m09-governance/GovernanceClient.tsx` | 659 | Extract ProposalCard, VoteBar |

- [x] `m06-agreements/AgreementsClient.tsx` — extract `<NewProjectModal>` to its own file
- [x] `m06-agreements/AgreementsClient.tsx` — `AgreementFormFields.tsx` extracted (FormField, FocusInput, FocusTextarea, inputStyle)
- [x] `m07-ops/OpsClient.tsx` — extract `<DeliverablesTab>` and `<UpdatesTab>` to own files
- [ ] Move repeated inline style objects (FilterChip, modal scaffolding) to `globals.css` or CSS modules

### 11. Replace `dangerouslySetInnerHTML` in HomeClient

`HomeClient.tsx:120` renders static bold-tagged strings via `dangerouslySetInnerHTML`. Not a security risk (content is hardcoded) but non-idiomatic.

- [x] Replaced with `parseStrong()` helper — renders `<strong>` tags as React nodes

### 12. Update changelog entry for v3.20

- [x] v3.20 entry updated to note duplicate dirs were left and cleaned up in v3.22
- [x] v3.22 changelog entry added documenting the full cleanup sprint

---

## Order of operations

1. Items 1–2 (delete duplicates + finish rename) — these are pure cleanup with no risk
2. Item 3 (roles.ts) — makes future code safer, low risk
3. Item 4 (promotions helper) — DRY improvement, low risk
4. Item 5 (api/scan rename) — must update callers, test Blueprint scanner
5. Items 6–9 — correctness fixes, do as you touch those files
6. Items 10–12 — tackle one component at a time as features are worked on
