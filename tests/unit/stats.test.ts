import { describe, expect, it } from "vitest";
import { COULDNT_READ, type Run, report, reportQueries } from "../../scripts/stats/report";
import type { AnalyticsEvent } from "../../src/lib/analytics/events";
import { d1EventStore } from "../../src/lib/analytics/store";
import { asD1, sqliteDb } from "./fixtures/sqlite-d1";

const NOW = Date.UTC(2027, 5, 15, 12);
const DAY = 24 * 60 * 60 * 1000;

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const visit = (
  ref: Extract<AnalyticsEvent, { name: "visit" }>["ref"],
  returning = false,
): AnalyticsEvent => ({
  name: "visit",
  page: "home",
  ref,
  referrer_host: ref === "linkedin" ? "www.linkedin.com" : null,
  returning,
});
const question = (nth: number, text: string, suggestion: number | null = null): AnalyticsEvent => ({
  name: "question",
  via: suggestion === null ? "typed" : "suggestion",
  suggestion,
  nth,
  text,
});
const answer = (
  nth: number,
  sources: number,
  outcome: Extract<AnalyticsEvent, { name: "answer" }>["outcome"] = "done",
): AnalyticsEvent => ({ name: "answer", nth, sources, outcome });

/** Four page loads in the last 7 days and one 20 days ago, through the real store. */
async function fixtures() {
  const db = sqliteDb();
  const store = d1EventStore(asD1(db));
  const day = (days: number) => NOW - days * DAY;
  await store.record(
    id(1),
    [
      visit("linkedin"),
      question(1, "What did Julian do at Cazoo?", 0),
      answer(1, 2),
      question(2, "Does Julian play the bagpipes?"),
      answer(2, 0),
      { name: "sources_opened" },
      { name: "cv_download" },
    ],
    day(1),
  );
  await store.record(
    id(2),
    [visit("cv", true), question(1, "Is Julian open to remote work?", 2), answer(1, 1)],
    day(2),
  );
  await store.record(
    id(3),
    [
      visit("none"),
      { name: "toy", which: "moo" },
      { name: "toy", which: "slider", slider: "wind" },
      { name: "toy", which: "slider", slider: "wind" },
    ],
    day(3),
  );
  await store.record(
    id(4),
    [visit("github"), question(1, "Hello?"), answer(1, 0, "visitor_limit")],
    day(4),
  );
  await store.record(
    id(5),
    [visit("cv"), question(1, "What is his favourite cheese?"), answer(1, 0)],
    day(20),
  );
  return db;
}

const runOn =
  (db: ReturnType<typeof sqliteDb>): Run =>
  async (sql) =>
    db.prepare(sql).all();

describe("the stats report", () => {
  it("reports the last 7 days", async () => {
    const text = await report(runOn(await fixtures()), NOW);
    const week = text.slice(text.indexOf("== Last 7 days =="), text.indexOf("== Last 30 days =="));
    expect(week).toContain(
      "Visits by ref\n  cv        1\n  github    1\n  linkedin  1\n  none      1",
    );
    expect(week).toContain("  (none)            3\n  www.linkedin.com  1");
    expect(week).toContain("  new        3\n  returning  1");
    expect(week).toContain(
      "  visit            4\n  first question   3  75%\n  second question  1  25%\n  CV or contact    1  25%",
    );
    expect(week).toContain(
      "Questions per conversation (page loads with at least one)\n  1  2\n  2  1",
    );
    expect(week).toContain("  typed         2\n  suggestion 0  1\n  suggestion 2  1");
    expect(week).toContain("Finished answers with no sources\n  1 of 3  33%");
    expect(week).toContain("  done           3\n  visitor_limit  1");
    expect(week).toContain("  slider: wind  2\n  moo           1");
    expect(week).toContain("CV downloads and contact messages\n  cv_download  1");
    expect(week).toContain("Outbound links\n  none");
  });

  it("includes older page loads in the last 30 days", async () => {
    const text = await report(runOn(await fixtures()), NOW);
    const month = text.slice(text.indexOf("== Last 30 days =="));
    expect(month).toContain("Visits by ref\n  cv        2");
    expect(month).toContain("Finished answers with no sources\n  2 of 4  50%");
  });

  it("lists the last 30 days' questions whose finished answer had no sources, newest first", async () => {
    const text = await report(runOn(await fixtures()), NOW);
    const uncovered = text.slice(text.indexOf("Questions with no sources"));
    expect(uncovered).toBe(
      [
        "Questions with no sources in their answer, last 30 days",
        "  2027-06-14 12:00  Does Julian play the bagpipes?",
        "  2027-05-26 12:00  What is his favourite cheese?",
      ].join("\n"),
    );
  });

  it("prints couldn't read it for a section whose query fails, never 0, and carries on", async () => {
    const db = await fixtures();
    const run: Run = async (sql) => (sql.includes("'outbound'") ? null : db.prepare(sql).all());
    const text = await report(run, NOW);
    expect(text).toContain(`Outbound links\n  ${COULDNT_READ}`);
    expect(text).not.toMatch(/Outbound links\n\s+0/);
    expect(text).toContain("Toys\n  slider: wind  2");
  });

  it("prints couldn't read it for rows of the wrong shape", async () => {
    const text = await report(async () => [{ surprise: true }], NOW);
    expect(text).toContain(
      `Funnel (home page loads that got this far, % of visits)\n  ${COULDNT_READ}`,
    );
    expect(text).not.toContain("  0");
  });

  it("counts visits by page, older visits without one as home, and the funnel from home only", async () => {
    const db = await fixtures();
    const store = d1EventStore(asD1(db));
    const projects: AnalyticsEvent = {
      name: "visit",
      page: "projects",
      ref: "none",
      referrer_host: null,
      returning: false,
    };
    await store.record(id(6), [projects, { name: "toy", which: "theme" }], NOW - DAY);
    // A visit recorded before visits had a page.
    db.prepare("INSERT INTO events (at, visit_id, name, data) VALUES (?, ?, 'visit', ?)").run(
      NOW - DAY,
      id(7),
      JSON.stringify({ ref: "none", referrer_host: null, returning: false }),
    );
    const text = await report(runOn(db), NOW);
    const week = text.slice(text.indexOf("== Last 7 days =="), text.indexOf("== Last 30 days =="));
    expect(week).toContain("Visits by page\n  home      5\n  projects  1");
    expect(week).toContain("  visit            5\n  first question   3  60%");
  });

  it("only ever reads", () => {
    for (const sql of reportQueries(NOW)) {
      expect(sql).toMatch(/^\s*(SELECT|WITH)\b/);
      expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b/i);
    }
  });
});
