-- Daily counts behind the contact form's limit (src/lib/contact/store.ts).
-- Days are UTC dates as YYYY-MM-DD, and a visitor is the same anonymous daily
-- hash as in visitor_messages. Only the count is kept: never the message, the
-- visitor's name or their address.

CREATE TABLE contact_messages (
  visitor_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  messages INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (visitor_hash, day)
);
