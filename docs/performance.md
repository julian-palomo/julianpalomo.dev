# Performance

How fast the site is, how it was measured, and how to measure it again. The
numbers are a snapshot; each section says when, on which host and at which
commit it was taken.

## Lighthouse

Taken on 13 Nov 2026 against production (`https://julianpalomo.dev`, with
`main` at `80023b7`), with Lighthouse 13.6.0 in Chrome 157 on a laptop.

- **Mobile** is Lighthouse's default: a Moto G Power, with simulated slow 4G
  (150ms round trips, about 1.6 Mbps) and a CPU four times slower.
- **Desktop** is `--preset=desktop`.
- **Each figure is the median of three runs.**
- Lighthouse's Chrome starts with no cookies, so every run is a visit's first
  page: the home page plays the full entrance.

| Page             | Form factor | Score | LCP  | FCP  | CLS | TBT   | Transfer |
| ---------------- | ----------- | ----- | ---- | ---- | --- | ----- | -------- |
| `/`              | Mobile      | 93    | 2.9s | 1.0s | 0   | 190ms | 427 KiB  |
| `/`              | Desktop     | 100   | 0.6s | 0.3s | 0   | 9ms   | 427 KiB  |
| `/projects`      | Mobile      | 99    | 1.0s | 1.0s | 0   | 132ms | 446 KiB  |
| `/projects`      | Desktop     | 100   | 0.5s | 0.3s | 0   | 9ms   | 446 KiB  |
| `/how-its-built` | Mobile      | 94    | 1.0s | 1.0s | 0   | 293ms | 380 KiB  |
| `/how-its-built` | Desktop     | 100   | 0.3s | 0.3s | 0   | 14ms  | 379 KiB  |

To run them again (`pnpm dlx` doesn't touch the lockfile; `CHROME_PATH` points
at an installed Chrome):

```sh
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
pnpm dlx lighthouse@13 "https://julianpalomo.dev/?notrack" --output=json --output-path=home-mobile.json --chrome-flags="--headless=new"
pnpm dlx lighthouse@13 "https://julianpalomo.dev/?notrack" --preset=desktop --output=json --output-path=home-desktop.json --chrome-flags="--headless=new"
```

`?notrack` keeps the runs out of the site's own analytics
([`analytics.md`](analytics.md)); headless Chrome is dropped from them anyway.

## The entrance and the home page's LCP

The home page's largest element is the chat's greeting bubble. On a phone it
shows when the entrance brings it in, so most of the mobile LCP is the entrance
itself: Lighthouse splits it into about 0.8s to the first byte and about 2.2s
of "element render delay".

| Visit                                                  | Mobile LCP | Desktop LCP |
| ------------------------------------------------------ | ---------- | ----------- |
| First visit, full entrance                             | 2.9s       | 0.6s        |
| Return visit (`visited` cookie), the 2s short entrance | 2.8s       | 0.6s        |

The return visit sends the `visited` cookie with
`--extra-headers='{"Cookie":"visited=1"}'`. Its short entrance still brings
the greeting in at about 2s, so its LCP barely moves.

**Julian decided on 2 Nov 2026 to keep the entrance** as it is
(`DESIGN.md` section 11), so this is recorded, not changed. #115 records
about 4.3s for the first visit from an earlier measurement, whose setup it
doesn't give.

## What each page loads

Taken the same day from production, on an emulated phone (412px wide), after
the page went idle. Sizes are as transferred, compressed.

| Page             | HTML  | JS     | CSS   | Fonts | Images | Sound sprite |
| ---------------- | ----- | ------ | ----- | ----- | ------ | ------------ |
| `/`              | 19 KB | 237 KB | 15 KB | 88 KB | 19 KB  | 43 KB        |
| `/projects`      | 18 KB | 205 KB | 15 KB | 88 KB | 71 KB  | 43 KB        |
| `/how-its-built` | 20 KB | 209 KB | 15 KB | 88 KB | 0      | 43 KB        |

**The JavaScript,** by chunk:

- **Every page:**
  - `index`, 88 KB: React DOM (about 207 KB of its 274 KB minified), the router and Start's client;
  - `transition-names`, 105 KB, shared by every page.
    - Its 315 KB minified hold Zod (99 KB), the router's core (56 KB), both languages' copy (`en.ts` and `es.ts`, 33 KB together), the landscape, the cow's drawing, the gear's panel, the theme and the sounds' provider.
    - The chunk is named after the first module Rolldown put in it, not after what it holds.
- **Each page's own chunk:**
  - **the home page's,** 34 KB: the chat, the AI SDK (64 KB of its 111 KB minified) and the contact form;
  - **Projects',** 1.3 KB; **How it's built's,** 4.8 KB.
- **Howler,** 10 KB, with the sound sprite, once the page is idle.
- **The chat stays on the home page.** The inner pages don't load the AI SDK or the chat's components. The router's `defaultPreload: "intent"` fetches a page's chunk only when a link to it is hovered or touched, so none of the above is a preloaded route.

**Fonts:** Bricolage Grotesque (41 KB) and Inter (47 KB), WOFF2, variable,
Latin only, both preloaded on every page. Both show above the fold on every
page (the name or the title, and the body text), so the preloads stay.

**Images:**

- The home page loads only the portrait, a 19 KB PNG, preloaded.
- Projects loads six AVIF screenshots (71 KB together), lazily, with WebP and PNG fallbacks.

**Sound:** the WebM sprite (43 KB) and Howler load once the page is idle, or
at the first tap, click or key ([`sounds.md`](sounds.md)), on every page,
since every page has sounds.

To see what a chunk holds, build with source maps once and read them, without
adding a dependency:

```sh
pnpm exec vite build --sourcemap
pnpm dlx source-map-explorer@2 dist/client/assets/<chunk>.js dist/client/assets/<chunk>.js.map --no-border-checks
```

Don't commit that build; the next `pnpm build` replaces it.

## Fixes

**Long-lived caching for hashed files** (`public/_headers`).

- **Before:** Workers serves static assets with
  `Cache-Control: public, max-age=0, must-revalidate`. So a browser asks again
  for every file on every page load, even when it has it.
- **After:** files under `/assets/`, whose names hold a hash of their content,
  are cached for a year, `immutable`.
- **Kept as they were:** files that keep their name when they change (the CV, the sound sprite, the images, the icons) keep the default.

Measured on a local production build (`pnpm preview`), loading `/` and then
`/projects` in one browser:

|        | Files from `/assets/` on the second load | Checked with the server (304) | From the browser's cache, no request |
| ------ | ---------------------------------------- | ----------------------------- | ------------------------------------ |
| Before | 8                                        | 7                             | 0                                    |
| After  | 8                                        | 0                             | 7                                    |

So a visitor's second page saves seven round trips, each about 150ms on the
mobile profile above. A first load doesn't change, so neither do Lighthouse's
numbers. `tests/e2e/caching.spec.ts` checks the header on both kinds of file.

## Proposed, not done

These change what a visitor sees or hears, or are large, so they're Julian's
call:

- **Zod on every page** (99 KB minified, about a third of the shared chunk).
  - The client parses cookies, the weather, search parameters and analytics events with it, as `.claude/rules/react-and-typescript.md` asks.
  - Zod's smaller `zod/mini` could replace it in client code. That's a rewrite of every schema the browser loads, and a change to the rule.
- **Both languages' copy on every page** (33 KB minified). Loading only the page's language would make the language toggle fetch the other one first, a delay a visitor could notice.
- **The sound sprite on every page** (43 KB, plus Howler's 10 KB). Loading it at the first tap instead of on idle would make the first sound play late.
- **The portrait as lossless WebP or AVIF,** a few KB smaller than the 19 KB PNG. That's a new image in `public/`, and `scripts/og/` uses the same file.
