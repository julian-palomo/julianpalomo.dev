import { describe, expect, it } from "vitest";
import { CI_PORT, e2ePort } from "../e2e/port";

const ROOTS = [
  "/work/julianpalomo.dev",
  "/work/julianpalomo.dev-bot",
  "/work/julianpalomo.dev-anim",
  "/work/julianpalomo.dev-how",
  "/work/julianpalomo.dev-analytics",
];

describe("e2ePort", () => {
  it("gives a worktree the same port every time, from 4200 to 4999", () => {
    for (const root of ROOTS) {
      const port = e2ePort({}, root);
      expect(e2ePort({}, root)).toBe(port);
      expect(port).toBeGreaterThanOrEqual(4200);
      expect(port).toBeLessThanOrEqual(4999);
    }
  });

  it("gives these worktrees different ports", () => {
    const ports = ROOTS.map((root) => e2ePort({}, root));
    expect(new Set(ports).size).toBe(ROOTS.length);
  });

  it("serves on 4173 in CI", () => {
    expect(e2ePort({ CI: "true" }, ROOTS[0] ?? "")).toBe(CI_PORT);
  });

  it("takes E2E_PORT over the folder and over CI", () => {
    expect(e2ePort({ E2E_PORT: "4300" }, ROOTS[0] ?? "")).toBe(4300);
    expect(e2ePort({ E2E_PORT: "4300", CI: "true" }, ROOTS[0] ?? "")).toBe(4300);
  });

  it.each(["", "abc", "4300.5", "-4300", "80", "70000", " 4300"])(
    "rejects E2E_PORT=%j",
    (value) => {
      expect(() => e2ePort({ E2E_PORT: value }, ROOTS[0] ?? "")).toThrow(
        "E2E_PORT must be a whole number from 1024 to 65535",
      );
    },
  );
});
