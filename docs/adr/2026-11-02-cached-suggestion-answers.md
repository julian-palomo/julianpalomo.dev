# The suggested questions are answered from a cache

- **Status:** Accepted
- **Date:** 2026-11-02

## Context

An answer's first word takes 3 to 5 seconds on Claude Sonnet 5.5. #121 found
why: the request after a tool result streams nothing until its text is whole.
The suggested questions under the chat are fixed text in `src/lib/i18n/`,
pressed far more often than anything typed, and their answers come from the
same claims every time.

## Decision

A question whose text, trimmed, is exactly one of the page language's
suggestions is answered from a D1 table, `cached_answers`.

- **The first time**, the model answers. The answer is stored only if it
  finished normally, wasn't stopped, and every citation is valid. Two visitors
  asking at once both get the model's answer, and the first row written stays.
- **After that**, the server replays the stored text and sources as the same UI
  message stream a model answer makes. The client and the chat's analytics
  events can't tell the difference.
- **The version** a stored answer belongs to is a SHA-256 of everything that
  shapes it: the model id, its settings, the output and step caps, the system
  prompt, both language notes, the tool definitions and the confirmed claims.
  A merge that changes any of them starts a fresh set with no manual step.
  It hashes `confirmedClaims()`, not the raw claims file: only confirmed
  claims reach the model, and the claims rule keeps every other module off
  that file.
- **History is ignored** for a suggestion: it is a standalone question. A hit
  replays the standalone answer, and a miss asks the model the suggestion
  alone, so the stored answer never depends on a conversation the next visitor
  didn't have.
- **The limits come first.** A suggestion counts as one of the visitor's
  questions and is refused at either daily limit, although a replay costs $0.
  That keeps one order for every question, and the visitor limit still holds
  for replays.
- **The cache fails open and the limits stay fail-closed.** An error reading or
  writing the table, such as a migration not yet applied, is logged and the
  model answers as before.
- Demo mode and the evals never read or write it. The evals' in-memory store
  has no cache, so an eval run always measures the model.

## Alternatives considered

- **Prewritten answers in the repo.** They'd be instant from the first visit,
  but someone would have to write and keep them true by hand. The cached ones
  are the model's own answers, from the same prompt and claims.
- **A cache keyed by the whole conversation.** It would almost never hit, since
  the "Keep asking" suggestions are pressed after other answers.
- **A time-to-live instead of a version.** A stale answer would stay until it
  expired, after a claim changed. The version changes the moment one does.
- **Skipping the limits for a replay.** One less D1 read, but two orders of
  checks to reason about, and a visitor could press suggestions without limit.

## Consequences

- A suggestion asked again starts at once, and costs nothing.
- The first visitor after each merge that changes the version waits as before
  and fills the cache.
- Rows from older versions are never read again. Deleting them is a follow-up,
  as for the analytics events.
- A bad stored answer stays until it is deleted by hand
  (`docs/architecture.md` has the command) or the version changes.
