-- The site's own analytics (src/lib/analytics/, docs/analytics.md): one row
-- per event, joined into a page load by visit_id, a random id the page makes
-- and keeps in memory only. No IP, IP hash or user agent is ever stored.
-- `at` is the server's time in ms since the epoch. `data` holds the event's
-- fields as JSON; a question's text is the one field kept apart, in
-- question_text, so it can be cleared after 90 days while the rest of the
-- row stays for 13 months.

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  at INTEGER NOT NULL,
  visit_id TEXT NOT NULL,
  name TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  question_text TEXT
);

-- The 13-month delete, and every report's time window.
CREATE INDEX events_at ON events (at);
CREATE INDEX events_name_at ON events (name, at);
-- The per-load cap and the joins between a page load's events.
CREATE INDEX events_visit_id ON events (visit_id);
-- The 90-day clearing of question text reads only the rows that still have
-- some; without it, every batch would walk every row older than 90 days.
CREATE INDEX events_question_text_at ON events (at) WHERE question_text IS NOT NULL;
