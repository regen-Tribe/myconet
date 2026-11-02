import Link from 'next/link'

const ENTRIES = [
  {
    version: 'v3.60',
    date: '2026-11-02',
    title: 'Bookings split into M15 Accommodation and M16 Resources',
    items: [
      'M15 Accommodation (/stays): book guest rooms, cabins and tent sites, by the night.',
      'M16 Resources (/bookings, also /resources): book tools, spaces and other shared things, by the hour.',
      'Each has its own sidebar entry, dashboard card, My bookings and Manage tabs. Adding an item only offers that module\'s categories.',
      'Old links to /bookings?category=accommodation now open the Accommodation page.',
    ],
  },
  {
    version: 'v3.59',
    date: '2026-11-02',
    title: 'Sidebar: Bookings sits under Calendar',
    items: [
      'M15 Bookings moved up in the sidebar to sit directly under M14 Calendar.',
    ],
  },
  {
    version: 'v3.58',
    date: '2026-11-02',
    title: 'M14 renamed Calendar; new Tasks tab',
    items: [
      'The Events module is now called Calendar in the sidebar, menus, dashboard and home pages. /calendar also works as an address.',
      'New Tasks tab next to Core events and Community hosted: things the community needs done, posted by members, circle leads and project leads. Instead of Going/Maybe, people tap "I\'ll help" or "Maybe", and the task shows who\'s helping.',
      'Joining members see Tasks locked in the form, with an explanation, the same as Core events.',
    ],
  },
  {
    version: 'v3.57',
    date: '2026-11-01',
    title: 'M15 Bookings: shared accommodation, tools and spaces; upcoming events on Dashboard and Home',
    items: [
      'New Bookings module at /bookings: browse the community inventory by category (Accommodation, Tools, Spaces), by tag, or by search. Anyone can browse; joining members and above can book.',
      'Admins and circle leads add items, tag them, set capacity and location, and choose whether bookings need approval. Circle leads manage items in their circles and items with no circle.',
      'Accommodation books by night (check-in/check-out); tools and spaces by time. Double bookings are blocked by the database, and the form warns before you submit.',
      'My bookings lists your upcoming and past bookings with Cancel. Manage shows requests waiting for approval (with a badge count) and lets leads edit, archive and restore items.',
      'Dashboard: new "Upcoming events" card and module cards for Events and Bookings.',
      'Home and the public landing page now have an Events section showing what\'s coming up; logged-out visitors see public events and can open the calendar.',
      'New events are public by default (untick "Public event" to keep one members-only).',
    ],
  },
  {
    version: 'v3.56',
    date: '2026-11-01',
    title: 'M14 Events: community calendar with core and community hosted events, RSVPs',
    items: [
      'New Events module at /events with Month, Week and List views, a circle filter, and a color legend matching the five circles.',
      'Two calendars: Core events (posted by full members, circle leads and project leads) and Community hosted (any joining member or above can post).',
      'Events can link to a circle, an Ops project and a Governance proposal. Project pages now show their upcoming events with an "+ Add event" shortcut.',
      'RSVP as Going or Maybe and see who else is coming. RSVP names are only visible to signed-in users.',
      'Public events: tick "Public event" and logged-out visitors can see it; everything else stays members-only.',
      'Hosts can edit or delete their events; admins and the event circle\'s leads can too. The database enforces the same rules.',
    ],
  },
  {
    version: 'v3.55',
    date: '2026-10-29',
    title: 'M07 Ops: explains blocked moves, new Circles tab, travel scoring fix',
    items: [
      'Trying to drag a board card you can\'t move now opens a pop-up explaining why (e.g. the project is in a circle you don\'t lead) and who can move it: that circle\'s leads and the admins.',
      'Project settings: circle leads outside the project\'s circle see a "view only" notice; picking a circle you don\'t lead explains that you can\'t move the project there.',
      'Board moves and settings saves that the database rejects no longer fail silently: the card snaps back and a pop-up says the change didn\'t save.',
      'New Circles tab in Operations (/ops?tab=circles): every circle with its leads and projects, which circles you lead, and which you\'re involved in.',
      'M01 travel match scoring now reads startDate/endDate, so the overlapping-dates (10 pts) and within-30-days (6 pts) tiers fire.',
    ],
  },
  {
    version: 'v3.54',
    date: '2026-05-25',
    title: 'M01 Network activity feed on Dashboard; activity feed labels and reordering',
    items: [
      'Dashboard now shows a dedicated "M01 · Member activity" feed (joins, offers posted, seeks posted) directly below the projects activity feed in the right column.',
      'Dashboard "Community activity" feed renamed to "Projects activity" — link updated to "View ops →".',
      'Every item in the Projects activity feed now shows a colored module tag pill (M01, M07, M09) for at-a-glance source identification.',
      '/network page activity feed section header renamed from "Member activity" to "M01 · Network activity".',
      '/network page: "Your matches" section moved above the "M01 · Network activity" feed.',
    ],
  },
  {
    version: 'v3.53',
    date: '2026-05-24',
    title: 'Regen Hood 0 branding, open nav for guests, 4-layer governance, agreements redesign, footer, version badge',
    items: [
      // ── Identity & Branding ──
      'Regen Hood 0 named throughout the product: home page hero, signup/login panels, and the blueprint module title now all reference "Regen Hood 0 — The Regen Tribe Regenerative Neighborhood".',
      'Blueprint module main page title changed from "Your project at a glance" to "The Regen Tribe Regenerative Neighborhood — Regen Hood 0 — Plan".',
      'Dashboard blueprint module card relabelled to "Our community & neighborhood plan at a glance".',

      // ── Home page ──
      'Home page hero now shows 8 clickable module pills — one per module (M00–M09) — each describing what that module does and smoothly scrolling (1600 ms ease-in-out) to its section on the page. Pill colors match the module accent. Hover lifts the pill and applies a module-tinted glow.',
      '"Take the tour" button refactored to use the shared smoothScrollTo() helper, eliminating duplicated scroll logic.',
      'Community purpose text on the home hero now comes directly from the blueprint purpose field in the database — editing the blueprint updates both the home page and the landing page automatically.',

      // ── Open navigation for guests ──
      'Non-logged-in users can now navigate to and view every module — M00 Dashboard, M01 Network, M04 Blueprint, M05 Join, M06 Agreements, M07 Operations, M08 Contributions, M09 Governance — without being redirected or locked out. Interactive actions (voting, proposing, submitting forms) remain gated.',
      'AppSideNav: member module links are always active. A small "view only · Join to interact →" pill replaces the previous opaque lock block for guests.',
      'Dashboard (/dashboard) no longer redirects guests to /home. Guests see community-wide stats (member count, active projects, open proposals, blueprint readiness) with "Join the community" and "Sign in" CTAs.',
      'Blueprint (/blueprint) removed from middleware-protected routes — the page already handles no-user gracefully (admin-only edit controls are hidden, community blueprint data is shown read-only).',

      // ── M09 Governance — 4-layer voting ──
      'Governance renamed "Consent" layer to "Sociocracy (Circle Leads)" — only circle_lead role members vote at L1.',
      'L2 Democracy: every full member (member+) gets one yes/no vote per proposal.',
      'L3 Meritocracy: admin and advisor roles vote approve/reject. New "advisor" role added to the system (assignable via admin/users panel).',
      'L4 AI facilitation: clicking a proposal triggers a background check via /api/governance/ai-check, which calls MiniMax M2.7 and compares the proposal against the community blueprint (purpose, vision, values). Returns a confidence score and reasoning blurb shown inline.',
      'DB migration: proposal_votes gains a "layer" text column (default "sociocracy"); unique constraint changed from (proposal_id, user_id) to (proposal_id, user_id, layer) so each user can vote once per layer. Vote CHECK constraint updated to accept consent/concern/object/yes/no/approve/reject.',
      'roles.ts: added isCircleLead(), isAdvisorOrAdmin(), and "advisor" to MEMBER_ROLES and JOINING_OR_ABOVE exports.',

      // ── M06 Agreements ──
      'Agreements page default view is now "My Agreements" — users land on a clean list of their own proposals, each showing project name, "Will contribute" / "Expects in return" panels, status badge, and submission date.',
      '"Browse & Propose" is now a secondary tab — the original two-column project browser is accessible but no longer the landing view.',
      'Empty state for My Agreements shows a friendly "No agreements yet — browse projects to make your first one" card with a direct button to the Browse tab.',

      // ── Shell & Design ──
      'AppTopBar: version badge (v3.53) is now a proper pill with border, background, and hover tint — replaces the previous dim 9px text that was easy to miss.',
      'AppFooter: every page now has a footer at the bottom of the scrollable content area with the app name on the left and a "v3.53 · Changelog ↗" badge on the right.',

      // ── Login / Signup ──
      'Login page "New here?" card updated with Regen Hood 0 label and community description.',
      'Register form header now opens with "Regen Hood 0" eyebrow, "Join the community" headline, and a bulleted list of what members can do (meet people, read the plan, join if aligned, contribute, decide together) before the form fields.',
      'Right panel of the auth page updated: "A regenerative neighborhood, built together." with a green live dot and Regen Hood 0 label.',
    ],
  },
  {
    version: 'v3.52',
    date: '2026-05-23',
    title: 'M05 Join — role roadmap visible to all users with live badge progress',
    items: [
      'The role roadmap now shows for every user — logged-out visitors, Explorers, Joining Members, and Full Members all land on the same view instead of different screens.',
      'Explorer card now has a "Badges you can earn" section with four live-checked achievement chips: 🪪 Profile Pioneer (fill in your profile), 🎉 Community Joiner (get accepted), 🤝 Collaborator (contribute to a project), 🚀 Project Lead (start your own project). Each chip lights up with a checkmark when the milestone is reached.',
      'Joining Member card shows inline application status (pending / reviewing / rejected) for Explorers with an existing application, or an "Apply to join →" button for those who haven\'t applied yet.',
      'Rejected applicants see a "Submit a new application →" button directly in the Joining Member row.',
      'Logged-out visitors see Explorer highlighted as "Start here" with a sign-up CTA at the bottom of the roadmap.',
      'The multi-step apply form is still fully accessible — clicking "Apply to join" opens it inline, with a "← Back to overview" link back to the roadmap.',
      'After submission the success screen has a "View your progress →" button that returns to the roadmap.',
      'Server now fetches hasContribution (accepted/active/completed agreement) and hasOwnProject (created project) to power the live badge states.',
    ],
  },
  {
    version: 'v3.51',
    date: '2026-05-23',
    title: 'M07 Ops — full user flow: proposals, subscriptions, calendar picker, subtask modal',
    items: [
      'Any joining+ member can now propose a project from /ops/new — proposal lands in the Ideas column with status "pending". Admins or circle leads accept it by dragging it to Backlog.',
      'Subscribe/unsubscribe to projects and individual subtasks. Subscriber avatar pills appear on the project header and on each subtask kanban card. Optimistic UI — no reload required.',
      'Custom CalendarPicker component replaces the native <input type="date"> throughout M07. Opens a smooth animated dropdown with month/year nav, day grid, today indicator, and a "Clear date" footer. No external dependencies.',
      'Project deadline is displayed in the project detail header with an overdue highlight in red. Admins can set/clear the deadline in the project settings panel.',
      'Click any subtask card to open a full edit modal: title field, CalendarPicker for due date, subscribe toggle with subscriber avatar list, Save and Delete buttons (canManage only). Non-managers see the modal in read-only + subscribe mode.',
      'Bell icon on each subtask card for quick subscribe/unsubscribe without opening the modal.',
      'Subscriber count label ("N subscribers") shown under project header avatars and inside the subtask edit modal.',
      'New DB tables: project_subscriptions and deliverable_subscriptions (both with RLS policies for select/insert/delete by authenticated users).',
      'Fix: SubscriberAvatars title attribute moved from inside style object to JSX prop in OpsClient.',
    ],
  },
  {
    version: 'v3.50',
    date: '2026-05-23',
    title: 'Blueprint module now shows the app shell sidebar (M00–M09 nav)',
    items: [
      'Blueprint (/blueprint) was rendered as a position:fixed full-viewport overlay — the entire app shell sidebar (M00–M09 module navigation) was hidden behind it.',
      'Fixed by switching .wizard-root from position:fixed to position:relative height:100%, so the wizard fills only the <main> grid cell and the sidebar stays visible.',
      'Added blueprint-shell-wrapper CSS class with a :has() selector to suppress the shell\'s overflowY on the blueprint route only, preventing double scrollbars while preserving the wizard\'s own internal scroll columns (Steps sidebar / Content / Radar rail).',
      'Blueprint\'s own three-column internal layout (steps sidebar, content area, right rail) is unchanged — only the positioning relative to the app shell changed.',
      'Also completed M01 profile pages full restyle (v3.46): ProfilePage and UserProfileClient tab bodies (About, Personality, Offers, Requests, Travel) converted from shadcn to inline-style design-system components.',
    ],
  },
  {
    version: 'v3.46',
    date: '2026-05-23',
    title: 'M01 profile pages fully restyled — tab bodies now match the dashboard visual language',
    items: [
      'ProfilePage (/network/profile) tab bodies restyled: About, Personality, Offers, Requests, and Travel tab content all converted from shadcn Card/Badge/Progress/Tabs to inline-style design-system components.',
      'UserProfileClient (/u/[username]) fully restyled: same conversion for all 5 tab bodies (About now also covers Growth & Healing section) + profile header now matches the same pattern as ProfilePage.',
      'Both profile views now use a custom pill-style tab bar (matching MatchesTabs) instead of shadcn Tabs.',
      'OCEAN trait bars replaced shadcn Progress with inline div bars using var(--m1) fill and var(--rule) track.',
      'Skills/Interests chips now use the Chip component (design-system color-mix pattern) with module-color accent for skills, neutral for interests.',
      'All shadcn imports (Card, CardContent, CardHeader, CardTitle, Badge, Progress, Tabs, Button, Avatar, Skeleton) removed from ProfilePage and UserProfileClient.',
    ],
  },
  {
    version: 'v3.45',
    date: '2026-05-23',
    title: 'M01 Members module pages restyled to match the dashboard (Google-style sleek)',
    items: [
      'Every /network/* page now follows the same visual language as /dashboard (M00) — mono eyebrows, display-font headings, white surfaces with thin grey borders, 10px card radii, 3px module-color top stripes, accent colors used sparingly.',
      'Restyled pages: /network (members dashboard), /network/matches (with new tab bar + score-bar match cards), /network/discover (with new filter chips + result cards), /network/offers, /network/seeks, /network/profile (header).',
      'New MatchesTabs — replaced shadcn Tabs with a segmented pill-style tab bar that matches the rest of the design. Match cards now have a 3px progress bar showing compatibility visually.',
      'New DiscoverClient — replaced shadcn Card / Badge / Button with inline-style cards. Search input + Select kept (shadcn primitives are fine for form controls).',
      'New repo-root doc DESIGN-SYSTEM.md captures the visual language: tokens, component patterns (StatCard, ModCard, eyebrows, next-step cards, avatars, chips), composition guidance, and explicit "what NOT to do" rules. The canonical reference is the M00 DashboardPage.',
    ],
  },
  {
    version: 'v3.44',
    date: '2026-05-23',
    title: 'Version badge on the public landing page + single source of truth for the version string',
    items: [
      'The version label under the logo (which links to this changelog) now also shows on the public landing page (logged-out view at /). Previously it only appeared inside the logged-in AppTopBar.',
      'Extracted VERSION into core/lib/version.ts — single source of truth used by both AppTopBar (logged-in) and the landing TopBar (logged-out). Bumping the version is now a one-line change.',
      'Also backfilled three missing changelog entries from the project\'s history: v3.06, v3.07, v3.21 (see below).',
      'Added a Changelog link to the repo README\'s Links section pointing to the live /changelog page + the source file.',
    ],
  },
  {
    version: 'v3.43',
    date: '2026-05-23',
    title: 'M01 shell consistency — every /network/* page now has the module sidebar + right panel',
    items: [
      '/network, /network/matches, /network/discover, /network/offers, /network/seeks all now render inside the same NetworkSidebar (left) + main content (middle) + NetworkRightPanel (right) shell that /u/[username] already had. Promoted that structure into network/layout.tsx as a server component so every M01 child route inherits it.',
      'AppSideNav: M01 (Members) now stays highlighted when viewing any /u/[username] public profile page — those pages are conceptually part of M01, not orphaned.',
      'Network layout fetches viewer profile, bio, and offers once and feeds the sidebar identity card + right-panel profile-completeness checklist. Logged-out visitors see the "Sign in" CTA in the sidebar and the "Join MyCoNet" CTA in the right panel.',
    ],
  },
  {
    version: 'v3.42',
    date: '2026-05-23',
    title: 'M01 matching v2 — fuzzy skills, location, travel overlap, goal keywords; root docs consolidation',
    items: [
      'M01 match scoring now considers 7 dimensions instead of 4. New caps (still summing to 100): Shared skills 25 (was 30), Shared interests 15 (was 20), OCEAN 20 (was 25), MBTI 20 (was 25), Location proximity 5 (new), Travel overlap 10 (new), Aligned goals 5 (new).',
      'Skill and interest matching is now fuzzy — Levenshtein similarity ≥80% + substring containment. "Permacultur Desgn" now matches "Permaculture Design"; "Regenerative ag" matches "Regenerative agriculture". Free-text fields finally work the way users expect.',
      'Location proximity: same country + city = 5 pts, same country only = 3 pts. Pulled from user_profiles.city/country, which callers now merge into the bio object before scoring.',
      'Travel overlap with date awareness: same destination + overlapping dates = 10 pts (reason "✈️ Both in Bali at the same time (Jun)"); within 30 days = 6 pts; same destination only = 4 pts. Uses user_bio.places_traveling JSONB with startDate/endDate.',
      'Goal-keyword overlap on user_bio.goals across 6 regenerative signal words (community / regenerative / sustainable / permaculture / nature / spiritual) — up to 5 pts.',
      'Richer match reasons consistent with existing UI tone: ✨ shared skills, 💚 shared interests, 🧠 personality, 🎯 MBTI / goals, 📍 location, ✈️ travel.',
      'Removed /api/claude/route.ts leftover file — was already replaced by /api/scan in v3.22. Fixed stale ARCHITECTURE §8 reference.',
      'home/HomeClient.tsx: replaced dangerouslySetInnerHTML on the "why" bullet lists with a parseStrong() helper that returns React nodes — closes CLEANUP item 11.',
      'Root docs consolidation: merged business/revenue content from AiNSP_RnDev.md into EXECUTIVE-SUMMARY (new "Service Model & Revenue" section). Merged future-agent architecture from techstack_AiNSP_RnDev.md into ARCHITECTURE §12 (event bus, MycoNet memory, two-group Telegram, approval flow). Both stale May-8/9 planning docs deleted.',
      'Repo navigability cleanup: deleted standalone landing-page/ (superseded by Next.js / and /home), deleted minimax-worker/ (superseded by /api/scan), removed 213 MB archive/Modules/MycoNetv1.0/ v1 Replit dump (its matching logic — the only piece of v2 value — was ported in this release).',
      'Restored archive/Modules/design_handoff_portal_explainer/ to the repo (DOCS.md was already pointing to it) — the original design spec that produced the now-live /home Portal Explainer.',
      'EXECUTION-PLAN.md refreshed to v2.2 reflecting current v3.01 state — M08 + M09 marked live, AppShell + ProfileCompletion + /home documented, deploy command corrected to deploy:cf.',
    ],
  },
  {
    version: 'v3.41',
    date: '2026-05-23',
    title: 'Circles, Kanban drag-and-drop, admin users editor, type consolidation',
    items: [
      'New core/lib/format.ts consolidates fmtDate, formatDeadline, colorForId, and initialForName — eliminates the duplicated copies across 6 files in m06-agreements and m07-ops.',
      'Restructured network/page.tsx user-conditional Supabase queries into a guarded if (user) block, removing all 10+ "as any" casts and giving the compiler full type inference. agreements/[id]/page.tsx now uses isJoiningOrAbove() instead of hardcoded role string.',
      'Cloudflare Worker renamed from tribes-platform → myconet. Live URL is now https://myconet.correa-oscar11.workers.dev. All docs, README, ARCHITECTURE, log.md, and wrangler.jsonc reflect the new name.',
      'Inline collaboration proposal form on project detail pages — the "Propose collaboration" and "Be the first to propose" buttons now open a form right on the project page (work description, expected reward, optional conditions) and submit via upsert. Existing pending/accepted/active proposals show a status panel instead.',
      'Mobile-optimized the project detail page: padding scales down, admin two-column grid stacks to single column, the add-subtask row goes vertical (title → date → button full-width), task titles truncate with ellipsis, proposal status badge wraps cleanly.',
      'Consolidated M07 ops types into modules/m07-ops/types.ts (Project, ProjectSummary, Deliverable, ProjectUpdate, CollaborationAgreement, MyProposal) — replaces 11 duplicated inline interfaces across 4 files and removes 6+ "any[]" props on ProjectDetailClient.',
      'Hardened user_profiles fetches: all 12 .single() calls in route pages converted to .maybeSingle() so brand-new users without a profile row don\'t error out — the existing role ?? "explorer" fallback handles the null case.',
      'Circles on projects — added projects.circle (one of ecology, hardware, humanware, economy, tech) and user_profiles.lead_circles (text[]). New core/lib/pillars.ts exports PILLARS, PILLAR_META (label, color, emoji), and isPillar() for any module to render a circle badge.',
      'Circle pill picker added to the propose-project modal (M06), the admin new-project form (M07), and the project detail settings panel. Project headers now show a circle badge for everyone.',
      'Kanban cards on the Ops board now support HTML5 drag-and-drop between status columns, permission-gated: admin can move any deliverable, project_lead can move deliverables in their own projects, circle_lead can move deliverables in projects whose circle they lead. Optimistic UI update on drop with router.refresh() after the DB write. Cards show a circle badge directly.',
      'New /admin/users page (admin-only) lists every user with an inline editor: role dropdown (Explorer, Joining, Member, Project lead, Circle lead, Admin) and — when role is circle_lead — a pillar pill picker for lead_circles. Search filters by name, username, or role. Per-row save button with Saving → ✓ Saved → Save states.',
      'Sidenav now shows an "Admin → Users" section that renders only for users with role admin.',
    ],
  },
  {
    version: 'v3.31',
    date: '2026-05-22',
    title: 'Ops subtasks, public collaborations, join journey page, agreement dedup',
    items: [
      'Project creators (created_by or lead_user_id) can now add, update, and delete subtasks directly on their project detail page. Subtask status is an inline dropdown (Backlog → In progress → Review → Done) with optimistic updates.',
      'Project creators can also post project updates — previously only admins could do this.',
      'Active collaborations (accepted/active/completed agreements) are now visible to every logged-in user on the project detail page, showing each collaborator, what they\'re contributing, and what they expect in return.',
      'Kanban cards on the Ops board are now clickable links that navigate to the project detail page.',
      'Collaboration agreements now use upsert instead of insert — submitting a proposal on a project you\'ve already proposed on updates the existing row instead of throwing a duplicate key error.',
      'If you already have an active proposal on a selected project, the form is replaced with a clear status panel showing the existing proposal\'s current state (pending, accepted, active, completed).',
      'The /join page for guests now shows a three-step community journey (Explorer → Joining Member → Full Member) with bullets explaining what each stage unlocks and a CTA to sign up.',
      'Full members and above (member, circle_lead, project_lead, admin) see a role roadmap on /join instead of the application form — all 6 roles shown with how to reach each one and what access it grants.',
    ],
  },
  {
    version: 'v3.30',
    date: '2026-05-22',
    title: 'Code quality sprint — component extraction and cleanup',
    items: [
      'Extracted NewProjectModal from AgreementsClient into its own file — self-contained, manages its own state, ~110 lines removed from the parent component.',
      'Extracted AgreementFormFields (FormField, FocusInput, FocusTextarea, inputStyle) into a shared module file, reused by both AgreementsClient and NewProjectModal.',
      'Extracted DeliverablesTab and UpdatesTab from OpsClient into their own files — removed ~200 lines of inline duplication from the ops module.',
      'All component extractions are pure refactors: zero behavior changes, build passes clean, all routes verified.',
    ],
  },
  {
    version: 'v3.22',
    date: '2026-05-22',
    title: 'Codebase cleanup sprint — roles, promotions, performance',
    items: [
      'Deleted four duplicate legacy directories (src/lib/, src/components/, src/contexts/, src/types/) that were left over from the v3.20 reorganization. Build now relies entirely on src/core/ and src/modules/.',
      'Finished resident → member role rename across all UI copy, landing page, sidebar section label ("Welcome Home"), and module descriptions.',
      'Centralized all role authority logic into src/core/lib/roles.ts — isFullMember, isCircleAdmin, isOpsAdmin, isAdmin, MEMBER_ROLES. Replaced 11 inline role arrays across the codebase.',
      'Role permission matrix clarified: circle_lead + admin manage Blueprint/Join/Agreements; circle_lead + project_lead + admin see the full Ops panel; admin only can edit records.',
      'Extracted member promotion logic into src/core/lib/promotions.ts — promoteToMemberIfEligible() checks both paths (accepted agreement + active project) in one parallel query.',
      'Renamed /api/claude → /api/scan (the route calls MiniMax, not Claude). Removed verbose debug console.log statements from production.',
      'Fixed sidebar role flash — role is now fetched server-side in layout.tsx and passed as a prop, so the correct role renders on the first paint with no client-side delay.',
      'Fixed optimistic agreement update to use the real DB row ID returned from insert instead of crypto.randomUUID().',
      'Collapsed N+1 queries in the Agreements admin view from 3 queries down to 1 using embedded Supabase joins.',
      'Added Pending proposals section to Ops admin view — admins can Activate or Decline proposed projects inline.',
      'Fixed projects_status_check DB constraint to include pending status, allowing joining users to propose new projects.',
    ],
  },
  {
    version: 'v3.21',
    date: '2026-05-22',
    title: 'Clickable dashboard stat cards + active nav highlight + live governance counts',
    items: [
      'M00 Dashboard stat cards are now clickable links that route to the relevant module page (Members → /network, Open projects → /ops, Proposals → /governance, etc.) instead of being inert display cards.',
      'Active side-nav module gets a clear highlight (background tint + colored left stripe) so the user always knows which module they\'re in.',
      'Dashboard Governance block now wires to live `proposals` table data — shows real open-proposal counts and the most recent proposal title instead of hardcoded zeros.',
      'Governance page role label fix: joining members no longer show as "Explorer" in the header — pulls actual role from `user_profiles`.',
      'Hotfix: stat cards converted to server-rendered `<Link>` components — earlier version had `onClick` handlers on server components which threw "Event handlers cannot be passed to Client Component props" at build time.',
    ],
  },
  {
    version: 'v3.20',
    date: '2026-05-22',
    title: 'Open-source codebase reorganization — core/ + modules/',
    items: [
      'Introduced a three-layer source architecture: src/core/ (shared infrastructure), src/modules/mXX-name/ (one self-contained folder per feature), and src/app/ (thin Next.js route entry points that simply re-export from modules).',
      'All feature components, utilities, and lib/ functions moved into their module folder — contributors can now work on M01 Network, M04 Blueprint, M07 Ops, etc. without touching anything outside that folder.',
      'src/core/ centralizes Supabase clients (server + browser), all shadcn/ui primitives, the app shell (AppTopBar, AppSideNav, AppShell), shared types, and contexts.',
      'Every module and core/ now has a README.md documenting what it does, which DB tables it touches, and how to run it locally.',
      'New web/CONTRIBUTING.md — full open-source contributor guide with quick-start, import convention table, database migration steps, and PR checklist.',
      'Legacy duplicate directories (src/lib/, src/components/, src/contexts/, src/types/) were left in place at this version — fully removed in v3.22.',
    ],
  },
  {
    version: 'v3.12',
    date: '2026-05-22',
    title: 'Mobile slide-in navigation panel',
    items: [
      'Mobile left navigation drawer — collapsed by default, opened via a "Modules" button in the top bar with a 4-grid icon.',
      'Nav slides in from the left with a 200ms cubic-bezier transition; a blurred backdrop appears behind it.',
      'Tapping any module link, the ✕ close button, or the backdrop closes the drawer.',
      'Desktop layout unchanged — sidenav remains a static column.',
      'AppTopBar hides the verbose "/ MyCommunityNetwork" sub-text and search bar on mobile to prevent overflow at narrow viewports.',
    ],
  },
  {
    version: 'v3.11',
    date: '2026-05-22',
    title: 'Mobile optimization pass across all pages',
    items: [
      'Fixed home page content cut-off for logged-in users on mobile — all sections get responsive padding and no-overflow root.',
      'Switched fixed repeat(N, 1fr) grids to auto-fit minmax() across Dashboard, Network, Governance, Ops, Agreements, and Home.',
      'Governance master-detail layout stacks vertically on small screens; sidebar collapses to a 260px-tall scrollable strip.',
      'Community Joiner achievement badge awarded automatically when a join applicant is accepted.',
      'Fixed upsert error: removed non-existent achievement_name column from user_achievements insert.',
    ],
  },
  {
    version: 'v3.10',
    date: '2026-05-21',
    title: 'Match scoring, AppTopBar dropdown, Home access tiers, Governance 4-layer demo',
    items: [
      'New match scoring engine (lib/match-score.ts) — scores two member bios across shared skills (up to 30 pts), shared interests (up to 20 pts), OCEAN personality similarity (up to 25 pts), and MBTI compatibility (up to 25 pts). Max score 100.',
      'Network dashboard shows a "Your Matches" section with top 4 ranked matches, with score badge and reasons. MemberList cards and tiles show a match % badge when a score is available.',
      'Public profile pages show a match score pill (score + reason) when viewing another member.',
      'AppTopBar avatar pill now opens a hover/click dropdown: View profile, Edit profile, Dashboard, Network, Contributions, Governance, theme toggle (light/dark), and Sign out.',
      'Home portal /home — new access tiers strip showing Browse → Create Account → Join → Resident with "YOU ARE HERE" highlight based on actual role.',
      'Joining reward banner on /home shown to joining+ roles with Community Joiner badge callout.',
      'Governance demo on /home upgraded to full 4-layer panel (Consent, Democracy, Meritocracy, AI Facilitation) with live progress bar and LIVE/Evaluating status.',
      'GovernanceClient now uses evalLayers() against real votes, with StatusPill component and role-gated "New proposal" button.',
      'Version tag in top bar now links to this changelog page.',
    ],
  },
  {
    version: 'v3.01',
    date: '2026-05-21',
    title: 'AppShell, M08 Contributions, M09 Governance, /home portal',
    items: [
      'New AppShell.tsx wraps all non-auth pages with AppTopBar + AppSideNav + ProfileCompletionProvider.',
      'Profile completion bar — 22px strip under nav showing % complete across 11 fields. Disappears at 100%.',
      'M08 Contributions page — achievement catalog with unlocked/locked states. Profile Pioneer badge awarded automatically at 100% profile completion.',
      'M09 Governance page — full proposal list with 4 decision-mode filters, vote breakdown bars, comment threads, and new proposal modal.',
      'New /home portal explainer — live data from all modules. Member cards, Blueprint phases, values checkboxes, project proposals, deliverables feed.',
      'New tables: user_achievements (with RLS), proposals, proposal_votes, proposal_comments.',
    ],
  },
  {
    version: 'v3.09',
    date: '2026-05-14',
    title: 'Conflict-aware AI review panel',
    items: [
      'When the AI suggests an answer for a field that already has content, both values are now shown side by side — you choose which to keep.',
      'Conflict fields default to "Keep current" instead of silently overwriting your existing answers.',
      'Each conflict card shows a status badge (Keep current / Use new answer) while collapsed; click to expand and compare.',
      'Non-conflict fields (AI-only answers) retain the same accept/reject toggle behavior.',
    ],
  },
  {
    version: 'v3.08',
    date: '2026-05-14',
    title: 'PDF upload support + admin role fixes',
    items: [
      'Blueprint file upload now supports PDF files (including 100 MB+). PDF.js extracts text page-by-page in the browser with a live progress bar before scanning begins.',
      'Chunk size increased from 5,000 → 15,000 characters. Large documents now need far fewer API calls to scan fully.',
      'Documents larger than 450,000 characters (30 chunks) show a truncation notice in the review panel so you know if content was cut.',
      'File dropzone now accepts .PDF alongside .txt, .md, and .json.',
      'Oscar admin role restored (had been reset to joining). Role enforcement is now consistent.',
    ],
  },
  {
    version: 'v3.07',
    date: '2026-05-15',
    title: 'Network experience polish — sidebar, right panel, tile/list view, guest browsing',
    items: [
      'M01 Network: every /network/* page now renders a persistent right panel with profile completeness + quick actions, plus the module sidebar on the left.',
      'Public profile pages /u/[username] gain the same NetworkSidebar + NetworkRightPanel treatment so they feel native to M01 instead of orphaned.',
      'Fix: right panel no longer shows "Join Free" CTA to already-logged-in users — checks session state before rendering the guest variant.',
      'Avatar upload on the public profile page wired to Supabase Storage; re-uploads now work (added storage DELETE policy + surface upload errors instead of failing silently).',
      'Network main page rebuilt as a grid of larger member cards with avatar + bio + offers/seeks chips. Tile/list view toggle so members can pick a denser browsing mode.',
      'Every live module page gets a bold colored identity band at the top (module number + name + tagline) so you always know which module you\'re in.',
      'Fix: nav overlap on module pages — top nav and module-header banners no longer collide at the top of the viewport.',
      'Landing page rewritten with a storytelling structure + live module showcase (v2.05).',
      'All main pages (dashboard, network, blueprint, join, agreements, ops) opened to guest browsing — sign-in only required for write actions.',
      'Dashboard module cards get hover tooltips explaining what each module does — helpful for first-time visitors who don\'t know what M04 or M07 actually means.',
    ],
  },
  {
    version: 'v3.06',
    date: '2026-05-14',
    title: 'Profile image upload + community blueprint goes public + dashboard live data',
    items: [
      'Profile wizard Step 1 gains photo upload — drag-drop / file-picker to Supabase Storage, square-crop preview, replaces previous avatar.',
      'User-type selector enriched with descriptions for each option and a sub-option set for "Community Member" (Founder / Resident / Visiting / Exploring) — replaces the bare radio list.',
      'Community blueprint made publicly readable — guests can view the full blueprint without an account. Edit access still gated to admin.',
      'Single-community blueprint enforced with an explicit `is_community = true` flag, so future per-community portals can find "the" blueprint via one query.',
      'Blueprint route now opens directly to the dashboard view instead of the empty welcome screen for users who already have answers.',
      'Dashboard M04 Blueprint card now pulls live community-blueprint metrics (phase, readiness score, gates passed) instead of placeholder text.',
      'Avatar upload path bug fixed — uploads were landing in the wrong bucket folder and not appearing on profile pages.',
      'v2.05 version tag added to the dashboard header so each deploy is easy to verify visually.',
    ],
  },
  {
    version: 'v3.05',
    date: '2026-05-14',
    title: 'Dashboard polish — color order, module layout, M02/M03',
    items: [
      'All 14 modules now follow a rainbow color order: M00 Black → M01 Brown → M02 Red → M03 Orange → M04 Yellow → M05 Green → M06 Blue → M07 Indigo → M08 Violet → M09 Pink → M10 White → M11 Silver → M12 Gold. Every card, badge, and page accent updated to match.',
      'Dashboard active modules grid now ordered numerically (M01 → M04 → M05 → M06 → M07).',
      'M02 Neighborhood Directory and M03 Resources & Tools moved to the coming-soon section — they link out to the v1 tribesplatform.app site with a "v1 available ↗" badge until v2 is built.',
      'Logo in the Nav now routes logged-in users to /dashboard and logged-out users to the landing page.',
    ],
  },
  {
    version: 'v3.04',
    date: '2026-05-14',
    title: 'M06 Agreements + M07 Operations',
    items: [
      'New /ops page — M07 Operations — lists all community projects. Admin can create projects, toggle "open for collaborators," post timeline updates, and accept/decline/progress collaboration proposals inline.',
      'New /agreements page — M06 Agreements — joining+ members browse projects open for collaboration and submit proposals specifying what they will do and what they expect in return. Status tracks through pending → accepted → active → completed.',
      'New projects, project_updates, and collaboration_agreements tables with RLS policies. Admin can update any agreement; users can only update their own pending proposals.',
      'Dashboard M06 and M07 cards show live counts (active projects, submitted proposals).',
      'Explorer-gated: M06 Agreements shows a "Complete M05 Join first" notice until the user has submitted their join application.',
    ],
  },
  {
    version: 'v3.03',
    date: '2026-05-14',
    title: 'Admin roles + dashboard home behavior',
    items: [
      'oscar and sonia accounts promoted to admin role — full access to Blueprint editing, project management, and agreement review.',
      'Logo tap/click routes logged-in users to /dashboard (their home screen) instead of the public landing page.',
      'M02 Neighborhood Directory and M03 Resources & Tools added to dashboard with external links to the v1 tribesplatform.app site.',
      'Dashboard modules reordered numerically (M01 → M02 → M03 → M04 → M05 → M06 → M07).',
    ],
  },
  {
    version: 'v3.02',
    date: '2026-05-14',
    title: 'M00 Dashboard + M05 Join module',
    items: [
      'New /dashboard page — M00 MyCoNet Dashboard — personal heads-up display for every member showing Blueprint progress, Network profile completeness, application status, and role-gated coming-soon panels for M05–M09.',
      'Role system added to user_profiles table (explorer / joining / resident / circle_lead / project_lead / admin) — defaults to explorer on signup.',
      'New /join page — M05 Join — application form that reads questions from the Blueprint wizard step 1.4. Logged-out visitors see the questions as a preview. Logged-in users submit answers stored in a new applications table.',
      'Blueprint wizard step 1.4 (First Agreements) now includes a "Join application questions" field — admin writes one question per line, these appear in the M05 Join form.',
      'Login and signup now redirect to /dashboard instead of /network.',
      'Dashboard link added to Nav for logged-in users.',
      'M00 and M05 marked Live in the module grid.',
    ],
  },
  {
    version: 'v2.16',
    date: '2026-05-13',
    title: 'MiniMax 524 retry + concurrency reduction',
    items: [
      'API route now auto-retries on MiniMax 524 gateway timeouts (waits 3s before retry) instead of immediately failing.',
      'Reduced parallel chunk concurrency from 4 → 2 to reduce simultaneous load on MiniMax and lower chance of triggering timeouts on large documents.',
      'Clearer user-facing error message when MiniMax times out after retry.',
    ],
  },
  {
    version: 'v2.15',
    date: '2026-05-13',
    title: 'Landing page button colors + hover states',
    items: [
      'Fixed "Create your profile" and module Live badges using wrong CSS variable (--accent, a pale gray-green) — now correctly use --accent-color (dark green).',
      'Added hover states to all landing page hero buttons and module cards (lift + shadow on hover).',
      'Strengthened shadcn Button hover overlay from near-invisible (3% black) to 7% with smooth 150ms transition and cursor-pointer.',
    ],
  },
  {
    version: 'v2.14',
    date: '2026-05-13',
    title: 'Forgot password flow',
    items: [
      'Added "Forgot password?" link on login form — sends a Supabase password reset email.',
      'New /auth/reset-password page: exchanges the reset code, then lets the user set a new password.',
      'Login page refactored to a three-mode state machine (login / register / forgot).',
    ],
  },
  {
    version: 'v2.13',
    date: '2026-05-13',
    title: 'Schema overhaul — MycoNet v1.0 parity',
    items: [
      'Rebuilt entire user schema to match MycoNet v1.0: personality_details and archetypes as jsonb, places_traveling in user_bio, user_types as text[].',
      'Rewrote profile wizard as an 8-step flow matching v1 exactly (TagInput, OCEAN sliders, zodiac/Human Design, offers/seeks/travel CRUD).',
      'Updated Discover, Matches, Offers, Seeks, Profile, and Dashboard pages to use new field names.',
      'Signup now collects first_name instead of display_name; handle_new_user trigger updated accordingly.',
      'Added Radix UI Slider component for OCEAN personality sliders.',
      'Added "Exploring" as a user type option across wizard and Discover filters.',
    ],
  },
  {
    version: 'v2.12',
    date: '2026-05-13',
    title: 'Light mode font contrast fix',
    items: [
      'Darkened --muted-foreground in light mode from 40% to 28% lightness for better readability.',
    ],
  },
  {
    version: 'v2.11',
    date: '2026-05-12',
    title: 'AI document scanning — working',
    items: [
      'Reduced chunk size from 15,000 → 5,000 chars per MiniMax call. Smaller chunks complete faster and stay within MiniMax\'s timeout window.',
      'Set max_completion_tokens to 8,192 — enough room for MiniMax M2.7\'s chain-of-thought reasoning plus the full JSON output.',
      'Deployed changelog page and home navigation on the Framework Wizard.',
    ],
  },
  {
    version: 'v2.10',
    date: '2026-05-12',
    title: 'Token budget increase',
    items: [
      'Raised max_completion_tokens to 16,384 to give MiniMax M2.7 more room for reasoning and JSON output.',
      'This caused MiniMax 524 gateway timeouts — reverted in v2.11.',
    ],
  },
  {
    version: 'v2.09',
    date: '2026-05-12',
    title: 'Debug logging + deployment diagnostics',
    items: [
      'Added server-side console.log statements in /api/claude to capture raw MiniMax response content in Cloudflare Worker logs.',
      'Confirmed the simple JSON extraction path works correctly for short prompts.',
    ],
  },
  {
    version: 'v2.08',
    date: '2026-05-12',
    title: 'Cloudflare Workers deployment',
    items: [
      'Migrated the entire Next.js app from Vercel to Cloudflare Workers using @opennextjs/cloudflare. Vercel Hobby caps function execution at 60s wall-clock; Cloudflare Workers only count CPU time, so waiting on MiniMax (60–120s) no longer causes timeouts.',
      'Removed export const runtime = "edge" from /api/claude — it conflicted with the OpenNext bundler and caused 500 errors.',
      'Added extractJSON() on the server to strip MiniMax M2.7\'s <think>…</think> reasoning blocks before parsing JSON.',
      'Set friendly error message: "We\'re working on our scanning process, thanks for the patience. Try again later please."',
    ],
  },
  {
    version: 'v2.07',
    date: '2026-05-12',
    title: 'Parallel chunk scanning + prompt tuning',
    items: [
      'Replaced sequential chunk scanning with parallel batches (CONCURRENCY=4).',
      'Increased max_completion_tokens from 1,500 → 4,096 to stop MiniMax from truncating output mid-reasoning.',
      'Removed system message — adding one made M2.7 reason much longer, using up the token budget before the JSON output.',
      'Matched prompt structure to the original working app.',
    ],
  },
  {
    version: 'v2.06',
    date: '2026-05-12',
    title: 'Version label on upload button',
    items: [
      'Added version number below the "Upload a document to start" button on the Blueprint welcome screen so each deploy is easy to verify.',
    ],
  },
  {
    version: 'v2.05',
    date: '2026-05-12',
    title: 'Initial MyCoNet v2 foundation',
    items: [
      'Next.js 16 app with Supabase auth, user profiles, and Cloudflare Workers target.',
      'Blueprint Wizard: full Regenerative Neighborhood Framework (SPARK → PROVE → BUILD → LIVE) with step navigation, radar chart, spiral timeline, and gate checks.',
      'Community Network: profile matching with AI-scored compatibility across values, skills, personality, and MBTI.',
      'MiniMax M2.7 integration for document scanning into wizard fields.',
    ],
  },
]

export default function ChangelogPage() {
  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '56px 24px 80px' }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--accent)', background: 'var(--accent-soft)',
          padding: '3px 10px', borderRadius: 20, marginBottom: 16,
        }}>
          Release notes
        </div>
        <h1 style={{
          fontFamily: 'var(--display)', fontSize: 40, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 12,
        }}>
          Changelog
        </h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.6 }}>
          A running log of what's been built and fixed on the MyCoNet.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ENTRIES.map((entry, i) => (
          <div key={entry.version} className="changelog-timeline" style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr',
            gap: '0 28px',
            paddingBottom: 40,
          }}>
            {/* Left column — version + date */}
            <div className="changelog-meta" style={{ paddingTop: 3 }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                color: 'var(--accent)', letterSpacing: '0.04em',
              }}>
                {entry.version}
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)',
                marginTop: 4, letterSpacing: '0.02em',
              }}>
                {entry.date}
              </div>
            </div>

            {/* Right column — content */}
            <div style={{
              borderLeft: '1px solid var(--rule)',
              paddingLeft: 28,
              position: 'relative',
            }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute', left: -5, top: 6,
                width: 9, height: 9, borderRadius: '50%',
                background: i === 0 ? 'var(--accent)' : 'var(--rule)',
                border: '1.5px solid var(--surface)',
                boxShadow: `0 0 0 1.5px ${i === 0 ? 'var(--accent)' : 'var(--rule)'}`,
              }} />

              <div style={{
                fontFamily: 'var(--display)', fontSize: 20, marginBottom: 12,
                color: 'var(--ink)',
              }}>
                {entry.title}
              </div>

              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entry.items.map((item, j) => (
                  <li key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--ink-4)', flexShrink: 0, marginTop: 2, fontSize: 12 }}>—</span>
                    <span style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.65 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        borderTop: '1px solid var(--rule)', paddingTop: 32, marginTop: 8,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Link href="/" style={{
          fontSize: 13, color: 'var(--ink-3)', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Back to home
        </Link>
        <span style={{ color: 'var(--rule)', fontSize: 12 }}>|</span>
        <Link href="/blueprint" style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500 }}>
          Open Blueprint Wizard
        </Link>
      </div>
    </div>
  )
}
