---
bump: minor
title: Operations remembers its filters when you come back
public: Filters on Operations — circle, subcircle, Due, person, role, late, drafts to confirm — and the tab you're on now stay when you open a task's page and press Back. They're kept in the page's address, so a link you share opens the same view too.
---
Oscar: "when a user filters something on operations, and then clicks into a task where a new page opens, if the user
presses back, can you please load the page the same way it was (with the filter on)". `OpsClient` (M07): the tab and the
filters (?tab= ?team= ?due= ?who= ?role= ?late=1 ?drafts=1, beside the existing ?circle= and ?view=) are written to the
address with `history.replaceState` as they change (no extra history entries), and every one starts from
`useSearchParams()` — the browser's current address — not the server's first render, which Next can reuse on Back from
before the filters were picked. Closing a task keeps Next's history state. Built in a community checkout: `next build`
passes. No migration.
