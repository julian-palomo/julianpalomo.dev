/**
 * The shape of a stored suggestion answer, kept apart from answer-cache.ts so
 * usage.ts can read and write rows without importing the prompt, the tools
 * and the claims.
 */
import { z } from "zod";
import type { Source } from "./citations";

/** A stored answer: its text with citation markers, and the sources the UI shows. */
export type CachedAnswer = { text: string; sources: Source[] };

/** A stored row's `sources` column, parsed back into the sources the UI shows. */
export const cachedSourcesSchema = z.array(
  z.strictObject({
    id: z.string(),
    label: z.string(),
    org: z.string().optional(),
    source: z.enum(["cv", "julian"]),
    text: z.string(),
    confirmedOn: z.string(),
  }),
) satisfies z.ZodType<Source[]>;
