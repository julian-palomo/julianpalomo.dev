# TanStack Redact: lighter, but it re-renders the whole page on hydration

- **Status:** Proposed
- **Date:** 2026-11-13

## Context

The site ships React DOM to every page: 75 KB of the shared `index` chunk,
with Brotli ([`../performance.md`](../performance.md)).
[TanStack Redact](https://github.com/TanStack/redact) is a smaller
browser and server runtime with React's API. A Vite plugin swaps it in for
`react` and `react-dom` at build time, so the app's code doesn't change.

Checked on 13 Nov 2026:

- **Version and licence:** `@tanstack/redact` 0.3.1, published 4 Nov 2026, MIT, maintained by TanStack, no install scripts. Still before 1.0.
- **Compatibility:** its docs test React 19.3.1, this repo's version.
- **Peers:** it asks for `@cloudflare/vite-plugin` exactly 1.65.0, the version installed here.
- **Setup for TanStack Start:** its guide adds `redact()` after `tanstackStart()` and `react()`, and sets `ssr: { noExternal: true }`.
- **Its own limits:**
  - rendering is synchronous, with no time slicing;
  - `addTransitionType` in React's own `ViewTransition` doesn't animate by default. This site's page transitions use the router's `defaultViewTransition`, the browser's API, so it doesn't apply.

The experiment ran on a throwaway branch, `chore/redact-experiment`, which was
never merged. It was branched from `chore/performance-pass`, so its preview
and that branch's differ only by Redact. Julian OK'd the dev dependency on that
branch only (#170).

## What was measured

**The bundle,** from two local production builds of the same commit. Sizes in
KB; Brotli at quality 11.

|        | Client JS and CSS, raw | gzip | Brotli | `index` chunk, Brotli | Worker, raw |
| ------ | ---------------------- | ---- | ------ | --------------------- | ----------- |
| React  | 821                    | 250  | 218    | 75                    | 2,628       |
| Redact | 648                    | 203  | 179    | 37                    | 2,169       |

So Redact saves about 40 KB of Brotli on every page, 18% of the client's JS
and CSS. The shared `transition-names` chunk and each page's own chunk barely
change. The Worker gets smaller too, despite `ssr.noExternal`.

**Lighthouse,** on the two branches' Workers previews (demo mode, a
`workers.dev` host), with Lighthouse 13.6.0. Median of three runs:

| Page             | Form factor | React: score, LCP, TBT, transfer | Redact: score, LCP, TBT, transfer |
| ---------------- | ----------- | -------------------------------- | --------------------------------- |
| `/`              | Mobile      | 92, 2.8s, 211ms, 428 KiB         | 91, 2.7s, 264ms, 380 KiB          |
| `/`              | Desktop     | 100, 0.6s, 11ms, 428 KiB         | 100, 0.6s, 30ms, 381 KiB          |
| `/projects`      | Mobile      | 98, 1.0s, 154ms, 448 KiB         | 99, 1.0s, 115ms, 401 KiB          |
| `/projects`      | Desktop     | 100, 0.6s, 14ms, 447 KiB         | 100, 0.5s, 11ms, 401 KiB          |
| `/how-its-built` | Mobile      | 93, 1.0s, 314ms, 381 KiB         | 96, 2.2s, 223ms, 334 KiB          |
| `/how-its-built` | Desktop     | 100, 0.3s, 21ms, 381 KiB         | 100, 0.3s, 29ms, 334 KiB          |
- **Transfer:** every page sends about 47 KiB less.
- **TBT:** mixed. It's higher on the home page and lower on the inner pages, and it varies by more than that between runs (210 to 571ms on one page with React).
- **How it's built's mobile LCP rose from 1.0s to 2.2s.** Six runs each confirmed it: React gave 1.0s in all six, Redact 2.2s in four of six.

**Why that LCP rose:**

- With React, the observed LCP always equals the first paint: the server's HTML is the largest paint, and it stays.
- With Redact, in the slow runs, the same text is painted again 50 to 60ms after the first paint, once the JavaScript has run. Lighthouse's simulation then places the LCP after the scripts.
- **What causes the repaint:** a `MutationObserver` during the load shows Redact removing the page's root container (`div.pb-12`) on every page and building it again. React keeps the server's DOM and only replaces a few small nodes, such as the hero clock's time, whose text differs between the server's render and the browser's.
- **The likely cause:** Redact handles that same small mismatch by rendering the whole tree again, not just the node. Not confirmed further.
- **What it means:** the server-rendered page is thrown away on every load. The visitor doesn't see it as a change, since the new DOM matches. But it costs the work hydration is meant to save, and on a slow phone a second paint of the whole page.

**What still works** on the Redact build:

- the full e2e suite: 245 of 245, in Chromium;
- a walk through `/`, `/projects`, `/how-its-built` and `/es`, which logged no console warning or error:
  - a demo answer streamed word by word;
  - Stop;
  - the contact dialog and the gear's panel opened;
- on its preview, `/api/chat` streamed a demo answer, as the React build's preview did, and `/api/weather` answered;
- the contact form's server function is covered by `contact.spec.ts` in the e2e run.

**The unit tests don't test Redact.** `vitest.config.ts` stands alone and doesn't load `vite.config.ts`, so they run on React. The e2e suite and the checks above are what tested it.

## Decision

Don't adopt Redact now. It works, and it saves about 40 KB of Brotli on every
page. But it re-renders every page from scratch on hydration, which loses what
server rendering gives and made How it's built's simulated mobile LCP twice as
slow. Adopting it is Julian's call and would be a separate issue.

## Alternatives considered

- **Adopt it as it is:** 18% less JavaScript and CSS, against a full re-render on every load and a pre-1.0 runtime that only Chromium checked here.
- **Find and remove the mismatch first,** for example render the clock's time only on the client, then try Redact again. If Redact then hydrates without replacing the root, the LCP cost should go. That's the experiment to run if Redact is reconsidered.
- **Keep React** and look for savings elsewhere ([`../performance.md`](../performance.md) lists them). That's what this decision does for now.

## Consequences

- The site stays on React DOM. Nothing in `main` changes, and the branch is deleted.
- **If Redact is reconsidered,** start with the hydration mismatch above, then measure again with a `MutationObserver` on the page's root and Lighthouse on a preview. Check Safari and Firefox too: only Chromium was checked here.
