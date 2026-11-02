/**
 * The events table in D1 (migrations/0003_events.sql): storing a batch
 * under the per-load cap, and the retention. Server only: endpoint.ts is the
 * one importer.
 */
import { type AnalyticsEvent, MAX_EVENTS_PER_LOAD } from "./events";

/**
 * The part of D1's binding this module uses (prepare, bind, first, run,
 * batch, from Cloudflare's D1 Worker API docs). Written by hand:
 * docs/tech-debt.md.
 */
type D1Statement = {
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
};

export type EventsDb = {
  prepare(query: string): { bind(...values: unknown[]): D1Statement };
  batch(statements: D1Statement[]): Promise<unknown>;
};

/** True when a binding looks like D1, so a missing or wrong binding fails closed. */
export function isEventsDb(value: unknown): value is EventsDb {
  return (
    typeof value === "object" &&
    value !== null &&
    "prepare" in value &&
    typeof value.prepare === "function" &&
    "batch" in value &&
    typeof value.batch === "function"
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** How long a question's text is kept. */
const QUESTION_TEXT_DAYS = 90;
/** How long an event is kept. */
const EVENT_MONTHS = 13;

/** Events from before this time are deleted. */
export function eventsCutoff(now: number): number {
  const date = new Date(now);
  date.setUTCMonth(date.getUTCMonth() - EVENT_MONTHS);
  return date.getTime();
}

/** Questions from before this time lose their text. */
export function questionTextCutoff(now: number): number {
  return now - QUESTION_TEXT_DAYS * DAY_MS;
}

/** An event as a row: its name, its other fields as JSON, and a question's text kept apart. */
function toRow(event: AnalyticsEvent): { name: string; data: string; text: string | null } {
  if (event.name === "question") {
    const { name, text, ...data } = event;
    return { name, data: JSON.stringify(data), text };
  }
  const { name, ...data } = event;
  return { name, data: JSON.stringify(data), text: null };
}

export type EventStore = {
  /** Stores the events, at most MAX_EVENTS_PER_LOAD per `visitId` counting those already stored; returns how many. */
  record(visitId: string, events: readonly AnalyticsEvent[], now: number): Promise<number>;
  /** Deletes events older than 13 months and clears question text older than 90 days. */
  prune(now: number): Promise<void>;
};

export function d1EventStore(db: EventsDb): EventStore {
  return {
    async record(visitId, events, now) {
      const stored = await db
        .prepare("SELECT COUNT(*) AS count FROM events WHERE visit_id = ?")
        .bind(visitId)
        .first<{ count: number }>();
      const room = MAX_EVENTS_PER_LOAD - (stored?.count ?? 0);
      const kept = events.slice(0, Math.max(0, room));
      if (kept.length === 0) return 0;
      await db.batch(
        kept.map((event) => {
          const row = toRow(event);
          return db
            .prepare(
              "INSERT INTO events (at, visit_id, name, data, question_text) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(now, visitId, row.name, row.data, row.text);
        }),
      );
      return kept.length;
    },

    // Two statements of their own, never in the insert's batch: a batch is one
    // transaction, and a failing prune would roll back the visitor's events.
    async prune(now) {
      await db.prepare("DELETE FROM events WHERE at < ?").bind(eventsCutoff(now)).run();
      await db
        .prepare(
          "UPDATE events SET question_text = NULL WHERE question_text IS NOT NULL AND at < ?",
        )
        .bind(questionTextCutoff(now))
        .run();
    },
  };
}
