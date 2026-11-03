---
paths:
  - "tests/**"
  - "vitest.config.ts"
  - "playwright.config.ts"
---

# Tests

## Never make `vitest.config.ts` extend `vite.config.ts`

It is standalone on purpose: the `tanstackStart` and `cloudflare` plugins set up
SSR routing and a Workers runtime that conflict with isolated unit tests.

## Unit tests (Vitest)

- Live in `tests/unit/`, matched by `tests/unit/**/*.test.ts`, in the `node` environment. A `.tsx` test or a DOM test needs that `include` and `environment` changed first; it won't run otherwise, and nothing will tell you.
- Exemplar: `tests/unit/site.test.ts`. One `describe` per unit, `it` sentences that read as behaviour ("puts the page first on any other page"), assertions against what the caller sees.
- Import the code under test by relative path (`../../src/lib/site`).
- No snapshot tests for logic.

## End-to-end tests (Playwright)

- Live in `tests/e2e/`. Exemplar: `tests/e2e/home.spec.ts`, which finds elements by role and accessible name.
- They run against a **production build** (`pnpm build && pnpm preview`, from `playwright.config.ts`), not the dev server. The build uses `wrangler.jsonc`'s `e2e` environment (`CLOUDFLARE_ENV=e2e`), so the chat answers in demo mode and never calls the model (`.claude/rules/bot.md`). Run `pnpm test:e2e` without asking when the change touches routes, components, styles, the landscape, the build or CI, and say so in one line before starting.
- **Each worktree has its own port** (`tests/e2e/port.ts`), so worktrees run e2e side by side: `E2E_PORT` when set, else 4173 in CI, else 4200 to 4999 from a hash of the worktree's folder, the same number in the runner and every worker. The run's first line says which (`e2e: serving on http://localhost:…`). The e2e preview runs without the Workers inspector (`vite.config.ts`), so two runs never race for its port.
- **Two full runs at once,** in two worktrees, take `--workers=2` each (`pnpm test:e2e --workers=2`). With the default workers both runs compete for the machine and fail on timeouts that neither has alone.
- A run never reuses a server it didn't start (`reuseExistingServer: false`, `--strictPort`): a server already on the port is another run of the same worktree, a `pnpm preview`, or, rarely, a worktree whose folder hashes to the same port. Then the run fails at once with "already used" instead of testing a build it didn't make: wait for the other run, or set `E2E_PORT` to another port.
- Tests that open `/` without a `lang` cookie expect English, so they assume the runner isn't in Spain: locally the Workers runtime takes the country from the machine's own connection, and on GitHub's runners it's the US. From Spain, `/` redirects to `/es` and they fail. The country rule is unit-tested in `tests/unit/locale.test.ts` instead, since the local runtime can't set a country per request.
- The `e2e` environment also sets `SCENE_OVERRIDE` (as `previews.vars` does; never at the top level of `wrangler.jsonc`, so production ignores `?sky=`), so `?sky=` (`winter,22:00,clouds=3`) fixes the landscape for a test (`tests/e2e/landscape.spec.ts`). A season other than today's moves the date to the 15th of its middle month (`seasonDay` in `src/lib/scene/season.ts`), and today's keeps today, so pick the season that gives the sky you test: at 22:00, July is still golden hour.
- The `e2e` environment sets `CONTACT_DEMO` too (as `previews.vars` does; never at the top level), so the contact form renders Turnstile with Cloudflare's always-passing test key and sends nothing (`tests/e2e/contact.spec.ts`, `docs/contact.md`). Turnstile's script and siteverify are real requests to Cloudflare, so that spec needs the network.
- The `e2e` environment also sets `ANALYTICS_BEACON_ANY_HOST`, so the page renders Web Analytics' beacon off the production host and `tests/e2e/analytics.spec.ts` can check that `?notrack` removes it (`docs/analytics.md`). `playwright.config.ts` maps the beacon's host to nowhere (`--host-resolver-rules`), so no run loads it or reports a visit with the real token; keep both. Every page also sends its analytics events to `/api/events`, which stores nothing off the production host; a test that reads them stubs the endpoint with `page.route`.
- Every test is a later visit: `playwright.config.ts`'s `storageState` sets the entrance's `visited` cookie, so the page plays the short entrance (about 2s) and the gear spins in 2s after it. `tests/e2e/entrance.spec.ts` clears it to test the first visit's. Reduced motion would skip the entrance too, but it also stills the cow and the answer's typing, which other specs check.
- Chromium only. CI installs it with `playwright install --with-deps --only-shell chromium`; adding a browser means changing both the config and `ci.yml`.

If an exemplar named here changes shape, update this rule.
