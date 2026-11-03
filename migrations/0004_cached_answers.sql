-- The suggested questions' answers, kept so a suggestion asked again is
-- answered at once (src/lib/bot/answer-cache.ts, docs/architecture.md). One
-- row per version, page language and suggestion: `version` hashes everything
-- that shapes an answer, so a change to the model, its settings, the prompt,
-- the tools or the claims starts a new set and old rows are never read again.
-- `text` is the answer with its citation markers; `sources` is the JSON of
-- its data-sources part. Nothing about the visitor is stored. `created_at` is
-- the server's time in ms since the epoch.

CREATE TABLE cached_answers (
  version TEXT NOT NULL,
  locale TEXT NOT NULL,
  question TEXT NOT NULL,
  text TEXT NOT NULL,
  sources TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (version, locale, question)
);
