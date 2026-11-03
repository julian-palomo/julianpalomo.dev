import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QUESTION_TEXT_DAYS } from "../../src/lib/analytics/events";
import {
  MAX_MESSAGES,
  MAX_VISITOR_MESSAGES_PER_DAY,
  MAX_VISITOR_TEXT,
} from "../../src/lib/bot/limits";
import { MAX_STEPS, MODEL_ID } from "../../src/lib/bot/model";
import { buildTools } from "../../src/lib/bot/tools";
import { CYCLE_STEPS } from "../../src/lib/how/cycle";
import { t } from "../../src/lib/i18n/t";

// The How it's built page and the composer's notice state numbers the code
// sets; they take them from the code, so they can't drift from it.

describe("the copy's numbers", () => {
  it.each(["en", "es"] as const)("in %s, the limits section states the code's limits", (locale) => {
    const text = t(locale, "howItsBuilt").limits.body(
      MAX_VISITOR_MESSAGES_PER_DAY,
      QUESTION_TEXT_DAYS,
    );
    expect(text).toContain(String(MAX_VISITOR_MESSAGES_PER_DAY));
    expect(text).toContain(String(QUESTION_TEXT_DAYS));
  });

  it.each(["en", "es"] as const)(
    "in %s, the composer's notice states how long questions are kept",
    (locale) => {
      expect(t(locale, "questionsKept")(QUESTION_TEXT_DAYS)).toContain(String(QUESTION_TEXT_DAYS));
    },
  );
});

// The diagrams' technical lines name things that live in server modules the
// page mustn't import (model.ts and tools.ts would bring the SDK and the
// claims into the browser), so they're written out, and checked here.
describe("the diagrams' copy", () => {
  it.each(["en", "es"] as const)("in %s, the ring states the code's limits", (locale) => {
    const ring = t(locale, "howItsBuilt").ring;
    const format = new Intl.NumberFormat(locale).format;
    const question = ring.question.technical(MAX_VISITOR_TEXT, MAX_MESSAGES);
    expect(question).toContain(format(MAX_VISITOR_TEXT));
    expect(question).toContain(String(MAX_MESSAGES));
    expect(ring.limits.plain(MAX_VISITOR_MESSAGES_PER_DAY)).toContain(
      String(MAX_VISITOR_MESSAGES_PER_DAY),
    );
    expect(ring.shortcut.plain(MAX_VISITOR_MESSAGES_PER_DAY)).toContain(
      String(MAX_VISITOR_MESSAGES_PER_DAY),
    );
  });

  it.each(["en", "es"] as const)(
    "in %s, Claude's line names the model, its tools and its steps",
    (locale) => {
      const line = t(locale, "howItsBuilt").ring.claude.technical;
      // claude-sonnet-5-5 is "Claude Sonnet 5.5".
      const [, family = "", major, minor] = MODEL_ID.split("-");
      const model = `Claude ${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`;
      expect(line).toContain(model);
      const tools = Object.keys(buildTools([]));
      // The copy says "three" ("tres").
      expect(tools).toHaveLength(3);
      for (const tool of tools) expect(line).toContain(tool);
      expect(line).toContain(String(MAX_STEPS));
    },
  );

  it.each(["en", "es"] as const)("in %s, the shortcut names the cache's table", (locale) => {
    const migration = readFileSync("migrations/0004_cached_answers.sql", "utf8");
    expect(migration).toContain("CREATE TABLE cached_answers");
    expect(t(locale, "howItsBuilt").ring.shortcut.technical).toContain("cached_answers");
  });

  it.each(["en", "es"] as const)("in %s, the cycle has a text for every step", (locale) => {
    expect(t(locale, "howItsBuilt").cycle.steps).toHaveLength(CYCLE_STEPS.length);
  });

  it("names reviewers and skills that exist", () => {
    const text = t("en", "howItsBuilt")
      .cycle.steps.map((step) => step.technical)
      .join(" ");
    for (const reviewer of ["constraint-reviewer", "docs-truth-checker"]) {
      expect(text).toContain(reviewer);
      expect(existsSync(`.claude/agents/${reviewer}.md`), reviewer).toBe(true);
    }
    for (const skill of ["implement-issue", "handoff", "ship-pr"]) {
      expect(text).toContain(`/${skill}`);
      expect(existsSync(`.claude/skills/${skill}/SKILL.md`), skill).toBe(true);
    }
    expect(existsSync(".claude/skills/implement-issue/wait-for-reply.sh")).toBe(true);
  });
});
