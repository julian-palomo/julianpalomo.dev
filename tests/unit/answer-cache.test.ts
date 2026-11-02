import { describe, expect, it } from "vitest";
import {
  cacheable,
  currentVersionInputs,
  suggestionFor,
  type VersionInputs,
  versionOf,
} from "../../src/lib/bot/answer-cache";
import { t } from "../../src/lib/i18n/t";

describe("suggestionFor", () => {
  it("matches each suggestion exactly, in both languages", () => {
    for (const locale of ["en", "es"] as const) {
      for (const suggestion of t(locale, "suggestions")) {
        expect(suggestionFor(suggestion, locale)).toBe(suggestion);
      }
    }
  });

  it("matches a suggestion typed with spaces around it", () => {
    expect(suggestionFor("  What is Form:at? \n", "en")).toBe("What is Form:at?");
  });

  it("matches nothing that isn't exactly a suggestion", () => {
    expect(suggestionFor("What is Form:at", "en")).toBeUndefined();
    expect(suggestionFor("what is form:at?", "en")).toBeUndefined();
    expect(suggestionFor("What is Form:at? And Cazoo?", "en")).toBeUndefined();
  });

  it("matches only the page language's suggestions", () => {
    expect(suggestionFor("What is Form:at?", "es")).toBeUndefined();
    expect(suggestionFor("¿Qué es Form:at?", "en")).toBeUndefined();
  });
});

describe("versionOf", () => {
  it("gives the same version for the same inputs", async () => {
    const inputs = await currentVersionInputs();
    expect(await versionOf(inputs)).toBe(await versionOf(await currentVersionInputs()));
    expect(await versionOf(inputs)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when any input changes", async () => {
    const base = await currentVersionInputs();
    const version = await versionOf(base);
    const changed: [string, VersionInputs][] = [
      ["the model", { ...base, modelId: "another-model" }],
      ["its options", { ...base, options: { effort: "medium" } }],
      ["the output cap", { ...base, maxOutputTokens: base.maxOutputTokens + 1 }],
      ["the step cap", { ...base, maxSteps: base.maxSteps + 1 }],
      ["the system prompt", { ...base, systemPrompt: `${base.systemPrompt}.` }],
      ["a language note", { ...base, languageNotes: [...base.languageNotes, "x"] }],
      [
        "a tool description",
        {
          ...base,
          tools: base.tools.map((tool, index) =>
            index === 0 ? { ...tool, description: `${tool.description}.` } : tool,
          ),
        },
      ],
      [
        "a tool's input schema",
        {
          ...base,
          tools: base.tools.map((tool, index) =>
            index === 0 ? { ...tool, inputSchema: { type: "object", properties: {} } } : tool,
          ),
        },
      ],
      [
        "a claim's text",
        {
          ...base,
          claims: base.claims.map((claim, index) =>
            index === 0 ? { ...claim, text: `${claim.text}.` } : claim,
          ),
        },
      ],
      ["a claim removed", { ...base, claims: base.claims.slice(1) }],
    ];
    for (const [what, inputs] of changed) {
      expect(await versionOf(inputs), what).not.toBe(version);
    }
  });

  it("doesn't depend on the order of an object's keys", async () => {
    const base = await currentVersionInputs();
    const reordered = Object.fromEntries(Object.entries(base).reverse()) as VersionInputs;
    expect(await versionOf(reordered)).toBe(await versionOf(base));
  });
});

describe("cacheable", () => {
  const finished = {
    finishReason: "stop",
    aborted: false,
    errored: false,
    invalidCitations: 0,
    text: "He worked on Motors.co.uk [[cazoo-role]].",
  };

  it("keeps an answer that finished normally with only valid citations", () => {
    expect(cacheable(finished)).toBe(true);
  });

  it.each([
    ["one cut off at the output cap", { finishReason: "length" }],
    ["one that ended on a tool call", { finishReason: "tool-calls" }],
    ["one that failed", { finishReason: "error" }],
    ["one with no finish reason", { finishReason: undefined }],
    ["one the visitor stopped", { aborted: true }],
    ["one whose stream reported an error", { errored: true }],
    ["one with an invalid citation", { invalidCitations: 1 }],
    ["an empty one", { text: "  " }],
  ])("never keeps %s", (_, change) => {
    expect(cacheable({ ...finished, ...change })).toBe(false);
  });
});
