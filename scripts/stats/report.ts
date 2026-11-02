/**
 * The `pnpm stats` report (docs/analytics.md): every section's query against
 * the events table (migrations/0003_events.sql) and how it prints. Pure: it
 * takes a `run` that returns a query's rows, or null when it failed, so the
 * queries are tested against an in-memory SQLite database
 * (tests/unit/stats.test.ts) and stats.ts runs them through wrangler.
 *
 * Read-only: every query is a SELECT, and `since` is an integer this module
 * computes, never text from outside, since wrangler's --command takes no
 * bound parameters. A query that fails prints "couldn't read it", never 0.
 */
import { z } from "zod";

/** Runs one SELECT and returns its rows, or null when it failed. */
export type Run = (sql: string) => Promise<unknown[] | null>;

export const COULDNT_READ = "couldn't read it";

const DAY_MS = 24 * 60 * 60 * 1000;

const countRows = z.array(
  z.object({ label: z.union([z.string(), z.number()]), count: z.number() }),
);

type Section = {
  title: string;
  sql: (since: number) => string;
  print: (rows: unknown[]) => string[];
};

/** Label and count, one line each. */
function counts(title: string, sql: (since: number) => string): Section {
  return {
    title,
    sql,
    print(rows) {
      const parsed = countRows.parse(rows);
      if (parsed.length === 0) return ["none"];
      const width = Math.max(...parsed.map((row) => String(row.label).length));
      return parsed.map((row) => `${String(row.label).padEnd(width)}  ${row.count}`);
    },
  };
}

const field = (path: string) => `json_extract(data, '$.${path}')`;

const percent = (part: number, whole: number) =>
  whole === 0 ? "–" : `${Math.round((part / whole) * 100)}%`;

const funnelRow = z.array(
  z.object({
    visits: z.number(),
    asked: z.number(),
    asked_again: z.number(),
    cv_or_contact: z.number(),
  }),
);

const noSourcesRow = z.array(z.object({ answered: z.number(), no_sources: z.number() }));

const SECTIONS: Section[] = [
  counts(
    "Visits by ref",
    (since) => `SELECT ${field("ref")} AS label, COUNT(*) AS count FROM events
      WHERE name = 'visit' AND at >= ${since} GROUP BY label ORDER BY count DESC, label`,
  ),
  counts(
    "Visits by referrer host (top 10)",
    (since) => `SELECT COALESCE(${field("referrer_host")}, '(none)') AS label, COUNT(*) AS count
      FROM events WHERE name = 'visit' AND at >= ${since}
      GROUP BY label ORDER BY count DESC, label LIMIT 10`,
  ),
  counts(
    "New and returning visits (returning: back within 7 days of the last visit)",
    (since) => `SELECT CASE WHEN ${field("returning")} THEN 'returning' ELSE 'new' END AS label,
      COUNT(*) AS count FROM events WHERE name = 'visit' AND at >= ${since}
      GROUP BY label ORDER BY label`,
  ),
  {
    title: "Funnel (page loads that got this far, % of visits)",
    sql: (since) => `WITH
      visits AS (SELECT DISTINCT visit_id FROM events WHERE name = 'visit' AND at >= ${since}),
      asked AS (SELECT visit_id, COUNT(*) AS n FROM events
        WHERE name = 'question' AND at >= ${since} GROUP BY visit_id),
      reached AS (SELECT DISTINCT visit_id FROM events
        WHERE name IN ('cv_download', 'contact_sent') AND at >= ${since})
      SELECT
        (SELECT COUNT(*) FROM visits) AS visits,
        (SELECT COUNT(*) FROM visits JOIN asked USING (visit_id)) AS asked,
        (SELECT COUNT(*) FROM visits JOIN asked USING (visit_id) WHERE n >= 2) AS asked_again,
        (SELECT COUNT(*) FROM visits JOIN reached USING (visit_id)) AS cv_or_contact`,
    print(rows) {
      const [row] = funnelRow.length(1).parse(rows);
      if (row === undefined) return [COULDNT_READ];
      const { visits } = row;
      return [
        `visit            ${visits}`,
        `first question   ${row.asked}  ${percent(row.asked, visits)}`,
        `second question  ${row.asked_again}  ${percent(row.asked_again, visits)}`,
        `CV or contact    ${row.cv_or_contact}  ${percent(row.cv_or_contact, visits)}`,
      ];
    },
  },
  counts(
    "Questions per conversation (page loads with at least one)",
    (since) => `WITH per AS (SELECT visit_id, COUNT(*) AS n FROM events
        WHERE name = 'question' AND at >= ${since} GROUP BY visit_id)
      SELECT CASE WHEN n >= 5 THEN '5+' ELSE CAST(n AS TEXT) END AS label, COUNT(*) AS count
      FROM per GROUP BY label ORDER BY label`,
  ),
  counts(
    "How questions were asked (suggestion N: its index in src/lib/i18n/en.ts)",
    (since) => `SELECT CASE WHEN ${field("via")} = 'typed' THEN 'typed'
        ELSE 'suggestion ' || ${field("suggestion")} END AS label, COUNT(*) AS count
      FROM events WHERE name = 'question' AND at >= ${since}
      GROUP BY label ORDER BY count DESC, label`,
  ),
  {
    title: "Finished answers with no sources",
    sql: (since) => `SELECT COUNT(*) AS answered,
        COALESCE(SUM(${field("sources")} = 0), 0) AS no_sources
      FROM events WHERE name = 'answer' AND ${field("outcome")} = 'done' AND at >= ${since}`,
    print(rows) {
      const [row] = noSourcesRow.length(1).parse(rows);
      if (row === undefined) return [COULDNT_READ];
      return [`${row.no_sources} of ${row.answered}  ${percent(row.no_sources, row.answered)}`];
    },
  },
  counts(
    "Answers by outcome (visitor_limit and daily_budget are the limits)",
    (since) => `SELECT ${field("outcome")} AS label, COUNT(*) AS count FROM events
      WHERE name = 'answer' AND at >= ${since} GROUP BY label ORDER BY count DESC, label`,
  ),
  counts(
    "Sources opened and answers copied",
    (since) => `SELECT name AS label, COUNT(*) AS count FROM events
      WHERE name IN ('sources_opened', 'copied') AND at >= ${since} GROUP BY label ORDER BY label`,
  ),
  counts(
    "Toys",
    (since) => `SELECT CASE WHEN ${field("which")} = 'slider'
          THEN 'slider: ' || ${field("slider")} ELSE ${field("which")} END AS label,
        COUNT(*) AS count
      FROM events WHERE name = 'toy' AND at >= ${since} GROUP BY label ORDER BY count DESC, label`,
  ),
  counts(
    "CV downloads and contact messages",
    (since) => `SELECT name AS label, COUNT(*) AS count FROM events
      WHERE name IN ('cv_download', 'contact_sent') AND at >= ${since}
      GROUP BY label ORDER BY label`,
  ),
  counts(
    "Outbound links",
    (since) => `SELECT ${field("to")} AS label, COUNT(*) AS count FROM events
      WHERE name = 'outbound' AND at >= ${since} GROUP BY label ORDER BY count DESC, label`,
  ),
];

const uncoveredRows = z.array(z.object({ at: z.number(), text: z.string().nullable() }));

/** The questions whose finished answer showed no source, newest first. */
const UNCOVERED: Section = {
  title: "Questions with no sources in their answer, last 30 days",
  sql: (since) => `SELECT q.at AS at, q.question_text AS text
    FROM events AS q JOIN events AS a
      ON a.visit_id = q.visit_id AND a.name = 'answer'
      AND json_extract(a.data, '$.nth') = json_extract(q.data, '$.nth')
    WHERE q.name = 'question' AND q.at >= ${since}
      AND json_extract(a.data, '$.outcome') = 'done' AND json_extract(a.data, '$.sources') = 0
    ORDER BY q.at DESC LIMIT 200`,
  print(rows) {
    const parsed = uncoveredRows.parse(rows);
    if (parsed.length === 0) return ["none"];
    return parsed.map(
      (row) =>
        `${new Date(row.at).toISOString().slice(0, 16).replace("T", " ")}  ${row.text ?? "(text deleted)"}`,
    );
  },
};

async function printSection(section: Section, since: number, run: Run): Promise<string[]> {
  const indent = (line: string) => `  ${line}`;
  const rows = await run(section.sql(since));
  if (rows === null) return [section.title, indent(COULDNT_READ)];
  try {
    return [section.title, ...section.print(rows).map(indent)];
  } catch {
    // Rows of an unexpected shape are as unreadable as a failed query.
    return [section.title, indent(COULDNT_READ)];
  }
}

/** What the report runs, in order: each section for 7 days, then for 30, then the uncovered questions. */
function plan(now: number): { heading?: string; section: Section; since: number }[] {
  const windows = [7, 30].flatMap((days) =>
    SECTIONS.map((section, index) => ({
      ...(index === 0 ? { heading: `== Last ${days} days ==` } : {}),
      section,
      since: now - days * DAY_MS,
    })),
  );
  return [...windows, { section: UNCOVERED, since: now - 30 * DAY_MS }];
}

/** Every query the report runs, for stats.ts's read-only check and the tests. */
export function reportQueries(now: number): string[] {
  return plan(now).map(({ section, since }) => section.sql(since));
}

/** The whole report as text. */
export async function report(run: Run, now: number): Promise<string> {
  const lines: string[] = [];
  for (const { heading, section, since } of plan(now)) {
    if (heading !== undefined) lines.push(heading, "");
    lines.push(...(await printSection(section, since, run)), "");
  }
  return lines.join("\n").trimEnd();
}
