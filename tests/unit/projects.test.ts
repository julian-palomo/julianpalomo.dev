import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROJECT_SHOTS, SHOTS } from "../../src/components/projects/shots";
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

  it("lists the newest first: julianpalomo.dev, then Form:at", () => {
    expect(t("en", "projects").map((project) => project.id)).toEqual(["site", "format"]);
  });
});

describe("the Projects page's screenshots", () => {
  it("each has its AVIF, WebP and PNG, the PNG at the size the page declares", () => {
    for (const [name, { width, height }] of Object.entries(SHOTS)) {
      for (const type of ["avif", "webp", "png"]) {
        expect(existsSync(`public/images/projects/${name}.${type}`), `${name}.${type}`).toBe(true);
      }
      // A PNG's width and height are the 4-byte numbers at bytes 16 and 20.
      const png = readFileSync(`public/images/projects/${name}.png`);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], name).toEqual([width, height]);
    }
  });

  it("each grows by its width over its height, so a row's shots share one height", () => {
    for (const [name, { width, height, grow }] of Object.entries(SHOTS)) {
      const ratio = Number(/^grow-\[([\d.]+)\]$/.exec(grow)?.[1]);
      expect(ratio, name).toBeCloseTo(width / height, 3);
    }
  });

  it("each shown one has alt text in both languages, and every project has some", () => {
    for (const project of t("en", "projects")) {
      const rows = PROJECT_SHOTS[project.id] ?? [];
      expect(rows.flat().length, project.id).toBeGreaterThan(0);
      for (const name of rows.flat()) {
        expect(t("en", "projectShots")[name]).toBeTruthy();
        expect(t("es", "projectShots")[name]).toBeTruthy();
      }
    }
  });
});
