/**
 * A D1 stand-in on Node's built-in SQLite, in memory, with the real
 * migrations applied, so the analytics SQL runs as written: D1 is SQLite.
 * Only the calls src/lib/analytics/store.ts and scripts/stats/report.ts make.
 */
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { fileURLToPath } from "node:url";
import type { EventsDb } from "../../../src/lib/analytics/store";

const migrations = fileURLToPath(new URL("../../../migrations/", import.meta.url));

export function sqliteDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(migrations).sort()) {
    db.exec(readFileSync(`${migrations}${file}`, "utf8"));
  }
  return db;
}

export function asD1(db: DatabaseSync): EventsDb {
  return {
    prepare(query) {
      return {
        bind(...values) {
          const params = values as SQLInputValue[];
          return {
            async first<T>() {
              return (db.prepare(query).get(...params) ?? null) as T | null;
            },
            async run() {
              return db.prepare(query).run(...params);
            },
          };
        },
      };
    },
    async batch(statements) {
      db.exec("BEGIN");
      try {
        for (const statement of statements) await statement.run();
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
