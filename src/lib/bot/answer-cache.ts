/**
 * The suggested questions' answer cache: which messages it answers, the
 * version a stored answer belongs to, and which answers may be stored. Pure,
 * so it can be unit-tested; the D1 reads and writes live in usage.ts and the
 * request flow in chat.ts. Why it exists: docs/adr/2026-11-02-cached-suggestion-answers.md.
 */
import { asSchema, type FlexibleSchema } from "ai";
import { type Claim, confirmedClaims } from "../claims";
import type { Locale } from "../i18n/locale";
import { t } from "../i18n/t";
import { anthropicOptions, MAX_OUTPUT_TOKENS, MAX_STEPS, MODEL_ID } from "./model";
import { pageLanguageNote, SYSTEM_PROMPT } from "./prompt";
import { buildTools } from "./tools";

/**
 * The suggestion `text` asks, trimmed, when it is exactly one of the page
 * language's suggestions; otherwise undefined, and the model answers as usual.
 */
export function suggestionFor(text: string, locale: Locale): string | undefined {
  const question = text.trim();
  return t(locale, "suggestions").includes(question) ? question : undefined;
}

/** Everything that shapes an answer. A change to any of them makes every stored answer stale. */
export type VersionInputs = {
  modelId: string;
  options: unknown;
  maxOutputTokens: number;
  maxSteps: number;
  systemPrompt: string;
  languageNotes: readonly string[];
  tools: readonly { name: string; description: string | undefined; inputSchema: unknown }[];
  claims: readonly Claim[];
};

/** JSON with every object's keys sorted, so the same inputs always hash alike. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .filter(([, inner]) => inner !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, inner]) => `${JSON.stringify(key)}:${stableJson(inner)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** The version of `inputs`: a SHA-256 of their stable JSON, as hex. */
export async function versionOf(inputs: VersionInputs): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(inputs));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A tool's input schema as JSON Schema, the form the model receives it in. */
async function jsonSchemaOf(schema: FlexibleSchema<unknown>): Promise<unknown> {
  return await asSchema(schema).jsonSchema;
}

/** The inputs as production answers with them: the model, its settings, the prompts, the tools and the confirmed claims. */
export async function currentVersionInputs(): Promise<VersionInputs> {
  const claims = confirmedClaims();
  const tools = await Promise.all(
    Object.entries(buildTools(claims)).map(async ([name, tool]) => ({
      name,
      // Every tool here has a fixed description; one built per call would have no fixed text to hash.
      description: typeof tool.description === "string" ? tool.description : undefined,
      inputSchema: await jsonSchemaOf(tool.inputSchema),
    })),
  );
  return {
    modelId: MODEL_ID,
    options: anthropicOptions,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxSteps: MAX_STEPS,
    systemPrompt: SYSTEM_PROMPT,
    languageNotes: [pageLanguageNote("en"), pageLanguageNote("es")],
    tools,
    claims,
  };
}

// Computed once per isolate: none of the inputs change while a Worker runs.
let current: Promise<string> | undefined;

/** The version production answers belong to now. */
export function answerVersion(): Promise<string> {
  // A failure isn't kept, so the next request tries again.
  current ??= currentVersionInputs()
    .then(versionOf)
    .catch((error: unknown) => {
      current = undefined;
      throw error;
    });
  return current;
}

/**
 * Whether a finished answer may be stored: it ended normally, wasn't stopped
 * or broken by an error, cites only claims a tool returned, and has text.
 */
export function cacheable(answer: {
  finishReason: string | undefined;
  aborted: boolean;
  errored: boolean;
  invalidCitations: number;
  text: string;
}): boolean {
  return (
    answer.finishReason === "stop" &&
    !answer.aborted &&
    !answer.errored &&
    answer.invalidCitations === 0 &&
    answer.text.trim().length > 0
  );
}
