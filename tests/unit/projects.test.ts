import { describe, expect, it } from "vitest";
import { confirmedClaims } from "../../src/lib/claims";
import { t } from "../../src/lib/i18n/t";

// The Projects page's points are taken from Julian's confirmed claims,
// shortened and adding nothing (DESIGN.md section 18, .claude/rules/claims.md).
// This keeps every point tied to a claim; the wording is Julian's to approve.

const confirmed = new Set(confirmedClaims().map((claim) => claim.id));

describe("the Projects page's copy", () => {
  it.each(["en", "es"] as const)("in %s, takes every point from a confirmed claim", (locale) => {
    for (const project of t(locale, "projects")) {
      expect(project.points.length).toBeGreaterThanOrEqual(3);
      expect(project.points.length).toBeLessThanOrEqual(5);
      for (const point of project.points) expect(confirmed).toContain(point.claim);
    }
  });

  it("cites the same claims, projects and links in both languages, in the same order", () => {
    const shape = (locale: "en" | "es") =>
      t(locale, "projects").map((project) => ({
        id: project.id,
        claims: project.points.map((point) => point.claim),
        links: project.links.map((link) => link.href),
      }));
    expect(shape("es")).toEqual(shape("en"));
  });

  it("puts Form:at first, then julianpalomo.dev", () => {
    expect(t("en", "projects").map((project) => project.id)).toEqual(["format", "site"]);
  });
});
