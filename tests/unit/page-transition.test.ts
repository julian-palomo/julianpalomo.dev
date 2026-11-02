import { describe, expect, it } from "vitest";
import { pageChange, pageOf } from "../../src/lib/page-transition";

describe("pageOf", () => {
  it("reads a path's page whatever its language", () => {
    expect(pageOf("/")).toBe("/");
    expect(pageOf("/es")).toBe("/");
    expect(pageOf("/es/")).toBe("/");
    expect(pageOf("/projects")).toBe("/projects");
    expect(pageOf("/es/projects")).toBe("/projects");
    expect(pageOf("/es/how-its-built/")).toBe("/how-its-built");
  });
});

describe("pageChange", () => {
  it.each([
    ["/", "/projects"],
    ["/projects", "/how-its-built"],
    ["/es/projects", "/es"],
    // "← Ask the cow" goes to /#ask: the hash is in the location, not the pathname.
    ["/projects", "/"],
    ["/es/how-its-built", "/es"],
  ])("animates %s → %s as a change of page", (from, to) => {
    expect(pageChange(from, to, false)).toEqual(["page"]);
  });

  it.each([
    ["/", "/es"],
    ["/projects", "/es/projects"],
    ["/es/how-its-built", "/how-its-built"],
    // `?ref=` or `#ask` tidied up: the same pathname.
    ["/", "/"],
    ["/es", "/es"],
  ])("doesn't animate %s → %s, the same page", (from, to) => {
    expect(pageChange(from, to, false)).toBe(false);
  });

  it("doesn't animate the first load, or anything with reduced motion", () => {
    expect(pageChange(undefined, "/projects", false)).toBe(false);
    expect(pageChange("/", "/projects", true)).toBe(false);
  });
});
