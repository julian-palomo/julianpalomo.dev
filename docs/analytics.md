# Analytics

How the site counts what visitors do, what it keeps, what it never keeps, and
how Julian reads it. The reasons are in
[the ADR](adr/2026-11-02-first-party-events-in-d1.md).

There are two sources:

- **The site's own events**, a small log in D1, read with `pnpm stats`. They
  answer the questions below, and they're the numbers to trust.
- **Cloudflare Web Analytics**, a rough second opinion on visit counts. It
  drops query strings, so it never sees `?ref=`, and it has no custom events.

## What is recorded

Each event answers one question. The list is closed and typed
([`src/lib/analytics/events.ts`](../src/lib/analytics/events.ts)): anything
else gets a `400` and isn't stored.

| Event                         | Fields                                                                                                                                                         | Answers                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `visit`                       | `page` (`home`, `projects`, `how_its_built`), `ref` (`linkedin`, `cv`, `github`, `other` or `none`), `referrer_host` (hostname only, or null), `returning`     | Which pages are read, how many come, from where, new or returning                                    |
| `question`                    | `via` (`typed`, which includes a question asked by voice and sent from the box, or `suggestion`), `suggestion` (its index in the list, or null), `nth`, `text` | Who talks, what they ask, which suggestions, questions per visit                                     |
| `answer`                      | `nth`, `sources` (the chips shown), `outcome` (`done`, `stopped`, `error`, `visitor_limit`, `daily_budget`)                                                    | Questions with no claim to answer them, limits hit                                                   |
| `sources_opened`, `copied`    | none                                                                                                                                                           | Whether people read the sources                                                                      |
| `toy`                         | `which` (`moo`, `panel_open`, `slider` with its `slider`, `back_to_live`, `theme`, `language`, `sound`)                                                        | Which toys get played with                                                                           |
| `cv_download`, `contact_sent` | none                                                                                                                                                           | CV downloads and messages: a press on "Download CV", and a message that went (never one that failed) |
| `outbound`                    | `to` (`linkedin` or `github`)                                                                                                                                  | Where people go next, from the links in the chat's error notice                                      |
- **`ref`** comes from `?ref=` in the link. The page reads it once, then removes it from the address bar through the router, so a copied link doesn't carry it on.
- **`page`** is the page that was loaded. A visit sent without it, from a tab opened before it existed, counts as `home`.
- **`returning`** means the visitor came back **within 7 days of their last visit**. It's the `visited` cookie that picks the entrance: it lasts a week and is refreshed on every visit, and the server reads it before refreshing it. Someone who comes back after two weeks counts as new.
- **`moo`** is a press on the cow on the chat's edge, not the moo that ends the entrance.
- **The season and the snow and haar switches** in the sky panel aren't recorded.
- **`answer`** is recorded when the request ends, from the chat UI. Pressing Stop while a finished answer is still typing itself out only shows the rest at once, so that answer counts as `done`. The bot's code doesn't know about any of this.

Every event carries a **`visit_id`**: a random UUID the page makes when it
loads, kept in memory only, never in a cookie or storage. It joins one page
load's events into a funnel without following anyone across visits. Switching
language keeps the page loaded, so it stays one page load with one `visit`.
Moving to another of the site's pages starts a new page load, with its own
`visit`, and sends the old one's queued events first.
The server adds the time.

## What is never recorded

No IP, no IP hash, no user agent, no language and no device. A question's text
is stored with its `visit_id` only, never with an IP or the hash the chat's
daily limits use.

## Retention

- **Question text** is deleted after **90 days**: the column is set to null, and the rest of the event stays.
- **Every event** is deleted after **13 months**.

There is no cron. Each batch `/api/events` stores is followed, after the
response, by one `DELETE` and one `UPDATE` that remove whatever is due. Both
use an index on the time, and the `UPDATE`'s index holds only rows that still
have text, so they read almost nothing when nothing is due. They run as their
own statements after the insert, so a failure there can't lose the visitor's
events. A day with no visits deletes nothing until the next one.

The composer says it, in both languages: "Questions are kept anonymously for
90 days to improve the assistant." So does the How it's built page. Both read
the number from `QUESTION_TEXT_DAYS` in
[`src/lib/analytics/events.ts`](../src/lib/analytics/events.ts), the same
constant the store clears question text by.

## Who is counted

Humans, on the real site, never Julian. The numbers can't be perfect: some
bots run JavaScript, and some people block scripts.

- **Only `julianpalomo.dev` stores anything.** `/api/events` answers `204` and stores nothing on any other host: previews, `pnpm dev`, `pnpm preview` and e2e.
- **Only pages whose JavaScript runs count.** The events are sent by the page, so most bots never send one.
- **Known bots and headless browsers are dropped** by the server, from a short list of user-agent patterns ([`src/lib/analytics/exclusions.ts`](../src/lib/analytics/exclusions.ts)). The user agent is checked, never stored.
- **`?notrack` excludes a browser.** See below.
- **At most 100 events per page load.** The page stops recording at 100, and the server stores at most 100 per `visit_id`.
  - The `visit_id` is made by the page, so this limits a normal page load. It can't stop someone posting batches by hand with new ids: those are bounded only by the schema and the body size.

`/api/events` checks, in order:

1. the body: at most 400 KB, and a valid batch of 1 to 100 events (`400` otherwise);
2. the host, the user agent and the `notrack` cookie (`204`, nothing stored);
3. the D1 binding (`503` without it);
4. then it stores the batch, after answering `204`.

## How events travel

The page queues its events and sends them with `navigator.sendBeacon` to
`POST /api/events` when the tab is hidden, the page is left, or a move to
another of the site's pages unmounts it. A send is split
into bodies under 60 KB, because browsers refuse a beacon past about 64 KB in
flight. A body the browser refuses stays queued for the next send. Recording
an event never throws and never waits.

## Excluding your own browsers: `?notrack`

On each browser and device you use, open:

```
https://julianpalomo.dev/?notrack
```

- It sets a `notrack` cookie for a year. With it, the server leaves Web Analytics' beacon out of the HTML, the page sends no events, and `/api/events` drops anything that arrives anyway.
- The parameter is removed from the address bar once read.
- `https://julianpalomo.dev/?notrack=0` deletes the cookie, and the browser is counted again.
- Clearing the site's cookies, or a private window, also clears it: open `/?notrack` again there.

The cookie can't hide a browser from Web Analytics' automatic injection, which
Cloudflare adds at its edge. Only the manual snippet, which the site renders
itself, respects it (below).

## Cloudflare Web Analytics

The site renders Cloudflare's beacon itself, as the "JS Snippet installation"
shows it, with the site token:

- only on `julianpalomo.dev`;
- never for a browser with the `notrack` cookie;
- as a module, so it never holds up the page.

The e2e build renders it on any host, so a test can check that `?notrack`
removes it (`ANALYTICS_BEACON_ANY_HOST`, only in `wrangler.jsonc`'s `env.e2e`).
The test browser can't resolve Cloudflare's host, so a test run never reports a
visit.

In the dashboard, Web Analytics → Manage site for `julianpalomo.dev` must be
on **"Enable with JS Snippet installation"**, not automatic injection.
Cloudflare's docs say a page can use only one snippet. With both on, every page
would carry Cloudflare's injected snippet next to the site's, and `notrack`
wouldn't hide anyone from the injected one.

## `pnpm stats`

```sh
pnpm stats          # the production database, through wrangler: needs Julian's Cloudflare login
pnpm stats --local  # the local database that `pnpm db:migrate:local` creates
```

Read-only: it runs only `SELECT`s, one wrangler call per section
([`scripts/stats/`](../scripts/stats/report.ts)). For the last 7 and 30 days
it prints:

- visits by page, with older visits that have no `page` counted as `home`;
- visits by `ref` and by referrer host;
- new and returning visits;
- the funnel: visit → first question → second question → CV or contact, as home page loads and as a percentage of them, since only the home page has the chat, the CV and the contact form;
- questions per page load;
- how questions were asked (typed, or which suggestion);
- finished answers with no sources;
- answers by outcome, which shows the limits hit;
- sources opened, answers copied, toys, CV downloads and contact messages, and outbound links.

Then it lists the last 30 days' questions whose finished answer showed no
source: what the assistant had no claim for.

Every number counts page loads, not people. Someone who goes from the home
page to Projects and back makes two home page loads, so the funnel's
percentages are per home page load: a drop between steps can be a visitor who
came back, not one who left.

A section whose query fails prints "couldn't read it" and the rest carry on. It
never prints 0 for a number it couldn't read.

There's no dashboard. A panel behind Cloudflare Access can come once this
report shows which numbers matter.
