/**
 * `pnpm stats`: the analytics report (docs/analytics.md) from the production
 * D1 database, through wrangler, so it needs Julian's Cloudflare login.
 * `pnpm stats --local` reads the local database instead, the one
 * `pnpm db:migrate:local` sets up, for testing. Read-only: it refuses to run
 * anything but a SELECT. Each section is its own wrangler call, so one that
 * fails prints "couldn't read it" and the rest carry on.
 */
import { spawnSync } from "node:child_process";
import { z } from "zod";

// Loaded by URL, because Node needs the file's extension, which tsc won't
// accept in a static import here.
const { report, reportQueries } = (await import(
  new URL("./report.ts", import.meta.url).href
)) as typeof import("./report");

const DATABASE = "julianpalomo-dev";
const local = process.argv.includes("--local");

const outputSchema = z.array(z.object({ results: z.array(z.unknown()), success: z.boolean() }));

function isReadOnly(sql: string): boolean {
  return /^\s*(SELECT|WITH)\b/i.test(sql) && !sql.includes(";");
}

async function run(sql: string): Promise<unknown[] | null> {
  if (!isReadOnly(sql)) return null;
  const result = spawnSync(
    "wrangler",
    ["d1", "execute", DATABASE, local ? "--local" : "--remote", "--json", "--command", sql],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr.trim() || result.stdout.trim());
    return null;
  }
  try {
    const [first] = outputSchema.parse(JSON.parse(result.stdout));
    return first?.success ? first.results : null;
  } catch {
    // wrangler printed something other than its JSON: the section can't be read.
    return null;
  }
}

const now = Date.now();
const unsafe = reportQueries(now).filter((sql) => !isReadOnly(sql));
if (unsafe.length > 0) throw new Error(`Not a single SELECT:\n${unsafe.join("\n\n")}`);

console.log(`${local ? "Local" : "Production"} database, ${new Date(now).toISOString()}\n`);
console.log(await report(run, now));
