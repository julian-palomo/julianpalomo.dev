/**
 * The bodies of /api/transcribe's answers: the text, or an error code. The
 * endpoint builds them and the recorder reads them, from this one module, so
 * the two can't drift apart. Safe to import in the browser.
 */
import { z } from "zod";

export const transcriptSchema = z.object({ text: z.string() });

export const transcribeErrorSchema = z.object({
  error: z.enum([
    "too_large",
    "bad_audio",
    "too_long",
    "visitor_limit",
    "daily_limit",
    "unavailable",
    "failed",
  ]),
});

export type TranscribeErrorCode = z.infer<typeof transcribeErrorSchema>["error"];

/** The fixed sentence demo mode answers, so previews and e2e work without Workers AI. */
export const DEMO_TRANSCRIPT = "What does Julian work on these days?";
