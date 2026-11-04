# RTRN (Regen Hood 0): this community's instance

Everything here is RTRN's own; the rest of the repo is MyCoNet core
([`regen-Tribe/myconet`](https://github.com/regen-Tribe/myconet)), pulled from its releases.

- **Live:** https://myconet.correa-oscar11.workers.dev (Cloudflare Worker `myconet`, Oscar's account)
- **Repo:** https://github.com/regen-Tribe/myconet-rtrn (branch `master`; moved from `regentribes/tribesplatform-v2-docs` on 2026-11-03, the old URL redirects). Core is the `upstream` remote.
- **Database:** Supabase project `vzgoulsqmhvhbjhzlzkf` (eu-west-1)
- **Deploy:** `cd web && npm run deploy`
- **Admins:** `oscar`, `sonia`. Circle leads: `oj`, `oscaroj`.

| Path | What |
|---|---|
| `config.jsonc` | Settings (name, URL, Cloudflare and Supabase IDs) |
| `seed/circles.sql` | RTRN's circles and roles (the neighborhood org chart) |
| `seed/switch-to-neighborhood-circles.sql` | One-off move off the five pillar circles (2026-11-03) |
| `log.md` | RTRN's change log, v1 to today |
| `docs/CLEANUP.md` | Old refactor notes |
| `supabase-archive/` | Migrations from before the core baseline (already applied; history only) |
