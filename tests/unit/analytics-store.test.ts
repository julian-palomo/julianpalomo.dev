import { describe, expect, it } from "vitest";
import type { AnalyticsEvent } from "../../src/lib/analytics/events";
import {
  d1EventStore,
  eventsCutoff,
  isEventsDb,
  questionTextCutoff,
} from "../../src/lib/analytics/store";
import { asD1, sqliteDb } from "./fixtures/sqlite-d1";

const VISIT_ID = "3f1c2a4e-8b7d-4c6e-9a5f-1d2e3f4a5b6c";
const NOW = Date.UTC(2027, 5, 15, 12);
const DAY = 24 * 60 * 60 * 1000;
const QUESTION: AnalyticsEvent = {
  name: "question",
  via: "typed",
  suggestion: null,
  nth: 1,
  text: "Does Julian need visa sponsorship?",
};

function setup() {
  const db = sqliteDb();
  const store = d1EventStore(asD1(db));
  const rows = () =>
    db.prepare("SELECT at, visit_id, name, data, question_text FROM events ORDER BY id").all();
  return { db, store, rows };
}

describe("d1EventStore.record", () => {
  it("stores a question's text apart from its other fields, and never anything about the request", async () => {
    const { store, rows } = setup();
    expect(await store.record(VISIT_ID, [QUESTION, { name: "sources_opened" }], NOW)).toBe(2);
    expect(rows()).toEqual([
      {
        at: NOW,
        visit_id: VISIT_ID,
        name: "question",
        data: JSON.stringify({ via: "typed", suggestion: null, nth: 1 }),
        question_text: QUESTION.text,
      },
      { at: NOW, visit_id: VISIT_ID, name: "sources_opened", data: "{}", question_text: null },
    ]);
  });

  it("stores at most 100 events per page load, counting those already stored", async () => {
    const { store, rows } = setup();
    const opened = (count: number) =>
      Array.from({ length: count }, () => ({ name: "sources_opened" }) as const);
    expect(await store.record(VISIT_ID, opened(60), NOW)).toBe(60);
    expect(await store.record(VISIT_ID, opened(60), NOW)).toBe(40);
    expect(await store.record(VISIT_ID, opened(1), NOW)).toBe(0);
    expect(rows()).toHaveLength(100);
    // Another page load has its own 100.
    expect(await store.record("7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", opened(1), NOW)).toBe(1);
  });
});

describe("d1EventStore.prune", () => {
  it("deletes events older than 13 months and keeps the rest", async () => {
    const { store, rows } = setup();
    const cutoff = eventsCutoff(NOW);
    expect(new Date(cutoff).toISOString()).toBe("2026-05-15T12:00:00.000Z");
    await store.record(VISIT_ID, [{ name: "sources_opened" }], cutoff - 1);
    await store.record(
      "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      [{ name: "sources_opened" }],
      cutoff,
    );
    await store.prune(NOW);
    expect(rows().map((row) => row.at)).toEqual([cutoff]);
  });

  it("clears question text older than 90 days and keeps the question itself", async () => {
    const { store, rows } = setup();
    const cutoff = questionTextCutoff(NOW);
    expect(cutoff).toBe(NOW - 90 * DAY);
    await store.record(VISIT_ID, [QUESTION], cutoff - 1);
    await store.record("7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", [QUESTION], cutoff);
    await store.prune(NOW);
    expect(rows().map((row) => [row.at, row.name, row.question_text])).toEqual([
      [cutoff - 1, "question", null],
      [cutoff, "question", QUESTION.text],
    ]);
  });

  it("clears question text through the partial index, never by walking every old row", async () => {
    const { db } = setup();
    const plan = db
      .prepare(
        "EXPLAIN QUERY PLAN UPDATE events SET question_text = NULL WHERE question_text IS NOT NULL AND at < ?",
      )
      .all(NOW);
    expect(JSON.stringify(plan)).toContain("events_question_text_at");
  });
});

describe("isEventsDb", () => {
  it("accepts a binding with prepare and batch, and nothing else", () => {
    expect(isEventsDb(asD1(sqliteDb()))).toBe(true);
    expect(isEventsDb({ prepare() {} })).toBe(false);
    expect(isEventsDb(undefined)).toBe(false);
  });
});
