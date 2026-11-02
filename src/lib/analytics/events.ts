/**
 * The site's own analytics events (docs/analytics.md): a closed, typed list,
 * each event answering one question about how visitors use the site. There is
 * no generic "track anything": a new event is a new member here, with the
 * question it answers. The client builds batches from it and /api/events
 * rejects anything else with a 400. Safe to import in the browser.
 */
import { z } from "zod";
import { MAX_VISITOR_TEXT } from "../bot/limits";

/**
 * How long a question's text is kept, in days. The composer's notice and the
 * How it's built page say it, so they read it from here.
 */
export const QUESTION_TEXT_DAYS = 90;

/** At most this many events per page load: the client stops recording, and the server stops storing. */
export const MAX_EVENTS_PER_LOAD = 100;

/** The site's pages, for a visit's `page`. */
const PAGES = ["home", "projects", "how_its_built"] as const;
export type PageName = (typeof PAGES)[number];

/** Where a visit came from, by its `?ref=`. */
const REFS = ["linkedin", "cv", "github"] as const;
type Ref = (typeof REFS)[number] | "other" | "none";

/** The answer's ends the chat can tell apart; the last two are the daily limits' 429s. */
const OUTCOMES = ["done", "stopped", "error", "visitor_limit", "daily_budget"] as const;
export type AnswerOutcome = (typeof OUTCOMES)[number];

const SLIDERS = ["hour", "clouds", "rain", "wind"] as const;
export type SliderName = (typeof SLIDERS)[number];

const nth = z.number().int().min(1).max(MAX_EVENTS_PER_LOAD);

const toySchema = z.discriminatedUnion("which", [
  z.strictObject({
    name: z.literal("toy"),
    which: z.enum(["moo", "panel_open", "back_to_live", "theme", "language", "sound"]),
  }),
  z.strictObject({ name: z.literal("toy"), which: z.literal("slider"), slider: z.enum(SLIDERS) }),
]);

export const eventSchema = z.discriminatedUnion("name", [
  z.strictObject({
    name: z.literal("visit"),
    // Which page was loaded. "home" when missing, so a tab opened before the
    // field existed still sends valid visits.
    page: z.enum(PAGES).default("home"),
    ref: z.enum([...REFS, "other", "none"]),
    referrer_host: z.string().min(1).max(253).nullable(),
    returning: z.boolean(),
  }),
  z.strictObject({
    name: z.literal("question"),
    via: z.enum(["typed", "suggestion"]),
    suggestion: z.number().int().min(0).max(50).nullable(),
    nth,
    text: z.string().min(1).max(MAX_VISITOR_TEXT),
  }),
  z.strictObject({
    name: z.literal("answer"),
    nth,
    sources: z.number().int().min(0).max(50),
    outcome: z.enum(OUTCOMES),
  }),
  z.strictObject({ name: z.literal("sources_opened") }),
  z.strictObject({ name: z.literal("copied") }),
  toySchema,
  z.strictObject({ name: z.literal("cv_download") }),
  z.strictObject({ name: z.literal("contact_sent") }),
  z.strictObject({ name: z.literal("outbound"), to: z.enum(["linkedin", "github"]) }),
]);

export type AnalyticsEvent = z.infer<typeof eventSchema>;

/** What the client posts: one page load's id and some of its events. */
export const batchSchema = z.strictObject({
  visit_id: z.uuid(),
  events: z.array(eventSchema).min(1).max(MAX_EVENTS_PER_LOAD),
});

export type EventBatch = z.infer<typeof batchSchema>;

/** A visit's `?ref=`: one of the known places, `other` for any other value, `none` without one. */
export function parseRef(value: unknown): Ref {
  if (value === undefined || value === null || value === "") return "none";
  const known = REFS.find((ref) => ref === value);
  return known ?? "other";
}

/** The referrer's hostname only, never its path or query; null without one, or for this site's own pages. */
export function referrerHost(referrer: string, ownHost: string): string | null {
  if (referrer === "") return null;
  try {
    const { hostname } = new URL(referrer);
    return hostname === "" || hostname === ownHost ? null : hostname;
  } catch {
    // Not a URL: nothing worth keeping.
    return null;
  }
}
