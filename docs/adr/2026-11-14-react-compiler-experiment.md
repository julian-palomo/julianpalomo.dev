# The React Compiler: less scripting, a little more JavaScript

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

This repo doesn't use the React Compiler:
`.claude/rules/react-and-typescript.md` says "There is no React Compiler".

The compiler memoises components and hooks at build time, so React renders
less of the tree when state changes. What it can change is how much work the
page does while it's used, not how much it weighs. So it was measured where
the page works hardest: typing a question, an answer streaming in, and the
gear's sliders.

Julian asked for the experiment on 13 Nov 2026, and OK'd its dev dependencies
on a throwaway branch only (#170). It ran on `chore/react-compiler-experiment`,
never merged, branched from `chore/performance-pass` like the Redact
experiment, so the two branches' previews differ only by the compiler.

**How it was turned on.** `@vitejs/plugin-react` 6.1.2's README offers two ways:

- the React team's compiler through Babel, with `reactCompilerPreset()`;
- a Rust port, which it calls experimental.

The Babel one was used:

```ts
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
plugins: [cloudflare(...), tailwindcss(), tanstackStart(), react(), babel({ presets: [reactCompilerPreset()] })]
```

Its three dev dependencies, all MIT, none with install scripts, checked on the
npm registry:

| Package                       | Version | Why this version                                                       |
| ----------------------------- | ------- | ---------------------------------------------------------------------- |
| `babel-plugin-react-compiler` | 1.0.0   | npm's `latest`, the stable 1.0                                         |
| `@rolldown/plugin-babel`      | 0.2.4   | plugin-react's peer range is `^0.1.7 \|\| ^0.2.0`; 0.3.1 is outside it |
| `@babel/core`                 | 7.29.13 | the compiler depends on `@babel/types ^7`                              |

pnpm installed them with no peer warning and asked to approve no build script.

## What was measured

**Scripting time and React commits,** on local production builds of the
same commit, with and without the compiler. Both were `e2e` builds, so the chat
answered in demo mode and never called the model. Measure on `e2e` builds
only: an ordinary `pnpm build` copies `.dev.vars`, so its preview holds the
real API key and the answer scenario would call the model. A first round did,
for about $0.20.

- **The measurement:** Chrome through Playwright, with the CPU slowed 4× (`Emulation.setCPUThrottlingRate`). Each scenario ran five times in a fresh page, and the median is reported, with the five runs' range.
- **Scripting time** is the change in Chrome's `ScriptDuration` metric over the scenario.
- **Commits** are counted through the React DevTools hook's `onCommitFiberRoot`, set before the page loads.
- **The scenarios:**
  - **typing:** 140 characters into the composer, 15ms apart;
  - **answer:** a demo answer, from sending until Send is back, with the wait's layers, the cow and the typing-out;
  - **sliders:** every slider in the gear's panel dragged end to end in 20 steps.
- **The machine** was a laptop, with a load average between 3 and 6 throughout from other apps. The builds were measured one after the other, so compare the columns, not the absolute times.

| Scenario | Base                            | Compiler                        | Change                             |
| -------- | ------------------------------- | ------------------------------- | ---------------------------------- |
| Typing   | 276ms (254 to 283), 280 commits | 254ms (207 to 279), 280 commits | about −8%, within the runs' spread |
| Answer   | 154ms (139 to 164), 56 commits  | 122ms (117 to 146), 56 commits  | about −21%                         |
| Sliders  | 395ms (369 to 474), 65 commits  | 294ms (290 to 333), 66 commits  | about −26%                         |

An earlier round, on builds that weren't in demo mode, gave about −25% in all
three. The sliders and the answer agree; typing's gain is the least certain.

**The commit count doesn't move, and that's expected.** The compiler saves the
components React renders within each commit, not the commits themselves. So
an unchanged count isn't "no effect": the scripting time is the number that
shows it.

**The bundle,** from the same two builds (KB, Brotli at quality 11):

|          | Client JS and CSS, raw | gzip | Brotli | Build time |
| -------- | ---------------------- | ---- | ------ | ---------- |
| Base     | 821                    | 250  | 218    | 1.8s       |
| Compiler | 873                    | 269  | 232    | 3.3s       |
- **JavaScript:** about 13 KB more Brotli, 6%, for the memoisation code the compiler adds.
- **Chunks:** Rolldown merged the shared chunk into `index`, but each page still loads about the same.
- **The Worker** is the same size.
- **Build time** nearly doubles, for the Babel pass. `pnpm dev` pays it on every changed file.

**Lighthouse,** on the two branches' Workers previews (demo mode, a
`workers.dev` host), with Lighthouse 13.6.0. Median of three runs:

| Page             | Form factor | Base: score, LCP, TBT, transfer | Compiler: score, LCP, TBT, transfer |
| ---------------- | ----------- | ------------------------------- | ----------------------------------- |
| `/`              | Mobile      | 92, 2.8s, 211ms, 428 KiB        | 91, 2.9s, 221ms, 441 KiB            |
| `/`              | Desktop     | 100, 0.6s, 11ms, 428 KiB        | 100, 0.6s, 6ms, 441 KiB             |
| `/projects`      | Mobile      | 98, 1.0s, 154ms, 448 KiB        | 99, 1.0s, 138ms, 454 KiB            |
| `/projects`      | Desktop     | 100, 0.6s, 14ms, 447 KiB        | 100, 0.6s, 16ms, 455 KiB            |
| `/how-its-built` | Mobile      | 93, 1.0s, 314ms, 381 KiB        | 97, 1.0s, 183ms, 390 KiB            |
| `/how-its-built` | Desktop     | 100, 0.3s, 21ms, 381 KiB        | 100, 0.3s, 11ms, 390 KiB            |
- **Transfer:** every page sends about 7 to 13 KiB more.
- **LCP** doesn't move.
- **TBT** is lower on How it's built, but TBT varies more between runs than that (210 to 571ms on one page without the compiler, [`../performance.md`](../performance.md)), so Lighthouse shows no change it can be sure of. A first load runs little of the code the compiler memoises; the scenarios above are where it shows.

**What it compiled.** The compiler's `logger` reported:

- **Compiled:** 118 functions in 73 files, 99 components and 19 hooks.
- **Skipped,** each for a limit of the compiler, not a bug in the code:
  - `Analytics` (`src/components/analytics/Analytics.tsx`): "Support value blocks (conditional, logical, optional chaining, etc) within a try/catch statement";
  - `TextField` (`src/components/contact/ContactDialog.tsx`): "Unexpected terminal kind `logical` for logical test block";
  - `useValley` (`src/components/landscape/use-valley.ts`): "Handle UpdateExpression to variables captured within lambdas".

None of them was rewritten to please it, and none was marked `"use no memo"`.

**What still works:**

- **The full e2e suite:** 244 of 245 in Chromium.
  - The one failure was "a phone gets the compact bar after the first question", a 30-second timeout.
  - Alone, it then passed three times out of three, so it looks like a timing flake under load. But it was seen only on this branch.
- **A walk through the pages** logged no console warning or error: `/`, `/projects`, `/how-its-built` and `/es`, a demo answer streaming, Stop, the contact dialog and the gear's panel.
- **The unit tests don't go through the compiler.** `vitest.config.ts` stands alone and doesn't load `vite.config.ts`, so they test the uncompiled code.

**With Redact,** on a local branch with both:

- the full e2e suite passed, 245 of 245;
- the client's JS and CSS came to 196 KB of Brotli: React alone is 218, Redact 179, the compiler on React 232;
- the scripting time follows Redact's, not React's: 629, 136 and 557ms for typing, answer and sliders. The compiler takes about a sixth off Redact's typing, but the pair still runs more script than React without the compiler. [Redact's ADR](2026-11-13-tanstack-redact-experiment.md) has its numbers.

## Decision

Don't adopt the compiler now. It works, and it cuts the scripting time of the
gear's sliders and a streaming answer by about a fifth to a quarter. But those
interactions already take a few hundred milliseconds at 4× slowdown,
Lighthouse shows no change on a first load, and it costs 13 KB more Brotli on
every page, a build twice as slow, three dev dependencies and a change to the
React rule. Adopting it is Julian's call and would be a separate issue.

## Alternatives considered

- **Keep the code as it is,** with no compiler, and its `useMemo` and `useCallback` written by hand where they matter. That's what the site does today, and it's fast enough: the scenarios above take a few hundred milliseconds at 4× slowdown.
- **The Rust port** (`oxc-transform-react`): faster builds, but marked experimental by `@vitejs/plugin-react`.
- **`compilationMode: 'annotation'`,** compiling only the components marked `"use memo"`: less code added, but each one chosen by hand.

## Consequences

- Nothing in `main` changes, and the branch is deleted.
- **Adopting the compiler** would be its own issue. It would:
  - change the rule that says there's no compiler, and the repo's `useMemo` and `useCallback` conventions;
  - add three dev dependencies and a Babel pass to every build;
  - decide what to do with the three functions it skips.
