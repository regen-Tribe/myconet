---
bump: patch
title: Working at the same time without clashing
public: Behind the scenes: a release now gets its version number when it ships, so several people can work on MyCoNet at once without their changes colliding.
---
On 2026-11-20/21 about ten sessions and Oscar kept conflicting on the same three release files and twice claimed
the same version (v4.65.0, v4.80.0). Nothing changes on screen.
- **A change no longer picks its version.** It adds one note, `changes/<slug>.md` (`bump`, `title`, `public`, and the
  CHANGELOG text). `web/scripts/release.mjs` (`npm run release`) takes the next free version after both the core tags
  and `CHANGELOG.md`, writes `version.ts`, `CHANGELOG.md` and the `/changelog` entries, and deletes the notes.
  `--dry-run` shows the result. `npm run upstream` refuses a change that edits those files or has no note, and the
  new **Change notes** check does the same on pull requests.
- **A release queue anyone can run:** `npm run ship -- <core PR>` (`web/scripts/ship.mjs`): one release at a time
  (the lock `/tmp/myconet-ship.lock`), the newest core `main` merged into the PR, the release written, lint and type
  check, merge, tag, the community's update PR, deploy, and a log entry. A real code conflict stops it with the
  files named. `--dry-run` goes as far as the checks and changes nothing. If core added migrations since the
  community's last core version (all of them, also from skipped releases), it stops before deploying and prints
  the files and the resume command, `npm run ship -- --community <version> --migrations-applied`.
- **The community's Core update** pushes its branch with `CORE_REPO_TOKEN` when it's set (it needs the `workflow`
  scope: a release that changes `.github/workflows/` can't be pushed otherwise), prints the real error when the
  push fails, and cuts long release notes so the PR body stays under GitHub's 65,536 characters.
- **One file per log entry:** a community's new entries go in `instance/log/<date>-<slug>.md`; `instance/log.md`
  stays as the archive. `npm run start-work` shows the newest entries.
- **Rules written down:** module styles live in the module's folder (`DESIGN-SYSTEM.md`, `web/CONTRIBUTING.md`), and
  "Working at the same time" in `CLAUDE.md` / `AGENTS.md`: one session per module, a draft PR before touching the
  shell, `roles.ts`, `LEXICON.md` or migrations.

No migration.
