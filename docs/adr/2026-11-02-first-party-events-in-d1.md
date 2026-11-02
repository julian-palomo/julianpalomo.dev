# First-party events in D1, with question text kept for 90 days

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

Julian wants numbers he can trust about how visitors use the site:

- how many come, and from where (LinkedIn, the CV, GitHub);
- how many talk to the assistant, what they ask, and where it has no claim to answer with;
- how far they get, from arriving to asking again or downloading the CV;
- which suggestions and toys get used, and how often a daily limit is hit.

He doesn't want language or device.

Cloudflare Web Analytics already runs on the site, injected automatically. It
can't answer most of this: it drops query strings, so it never sees `?ref=`,
and it has no custom events. The site already has a D1 database for the
chat's daily limits, and a Worker in front of every request.

His other project taught two things:

- automatic beacon injection stopped there without warning;
- a wrong site token once cost a month of data.

## Decision

- **A small first-party event log.** The page sends a closed, typed list of events to `POST /api/events`, which stores them in D1. A read-only `pnpm stats` reports on them through wrangler.
- **Web Analytics stays as a second opinion on visit counts.** Its beacon is rendered by the site with a fixed token, not injected by Cloudflare.
- **Question text is kept, anonymously, for 90 days.** Julian decided this on 2 Nov 2026, so he can see what visitors ask and where the assistant has nothing to answer with.
  - The text is stored with the page load's random id only, never with an IP, the limits' visitor hash or a user agent.
  - A line under the composer says so in both languages.
  - Events are kept for 13 months.

`docs/analytics.md` has what is recorded, the exclusions and how to read it.

## Alternatives considered

- **A third-party analytics tool** (Plausible, PostHog, Google Analytics):
  - another processor of visitors' data, and another script on the page;
  - question text would leave our infrastructure;
  - most don't let us keep a strict, closed list of events.
- **Web Analytics alone:** it can't see `?ref=`, questions, answers or toys.
- **Workers Analytics Engine:**
  - built for high-volume metrics, with sampling and SQL over an HTTP API;
  - D1 is already bound, its SQL is what the tests run against, and this site's volume is small.
- **No question text, or text hashed:**
  - the question "where does the assistant have no claim to answer with?" needs the words;
  - 90 days is long enough to act on them.
- **A dashboard now:** `pnpm stats` comes first, to learn which numbers matter. A panel behind Cloudflare Access can follow.

## Consequences

- **Every new event is a code change** to the closed list in `src/lib/analytics/events.ts`, with the question it answers. Anything else is refused with a `400`.
- **Each stored batch also runs the retention**, so no cron is needed.
  - Its two statements are indexed, so they read almost nothing when nothing is due.
  - D1 bills rows read, so keep them indexed if the table changes.
- **The numbers are a floor and a ceiling at once.** People who block scripts aren't counted, and bots that run JavaScript with an ordinary user agent are.
  - The 100-event cap per page load holds for a normal page.
  - Someone posting batches by hand with new ids is bounded only by the schema and the body size.
- **Julian's own browsers** need `?notrack` once each, and again after clearing cookies.
- **Web Analytics' setting must stay on the JS snippet**, not automatic injection. Otherwise every page carries two snippets, and `notrack` can't hide anyone from Cloudflare's.
