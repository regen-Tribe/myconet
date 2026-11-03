# instance.example

The starting point for a new MyCoNet community. Copy this folder to `instance/`
(in that community's repo) and fill in `config.jsonc`.

What lives in `instance/`, and only there: this community's settings, theme, seed
content, extra migrations and history. Everything else is MyCoNet core: don't edit
it in a community repo; make the change in core and pull the release.
See `INSTANCES.md` and `CORE-EXTRACTION.md` at the repo root.

The build reads `instance/config.jsonc` (or the folder in `MYCONET_INSTANCE_DIR`)
via `web/scripts/instance.mjs`, which writes `web/wrangler.jsonc` and
`web/.env.production.local`. Both are generated: don't edit them.
