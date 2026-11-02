import { describe, expect, it } from "vitest";
import { QUESTION_TEXT_DAYS } from "../../src/lib/analytics/events";
import { MAX_VISITOR_MESSAGES_PER_DAY } from "../../src/lib/bot/limits";
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

  it("has as many steps, diagram steps and links in both languages", () => {
    const en = t("en", "howItsBuilt");
    const es = t("es", "howItsBuilt");
    expect(es.steps).toHaveLength(en.steps.length);
    expect(es.diagramSteps).toHaveLength(en.diagramSteps.length);
    expect(es.docs.map((doc) => doc.path)).toEqual(en.docs.map((doc) => doc.path));
  });
});
