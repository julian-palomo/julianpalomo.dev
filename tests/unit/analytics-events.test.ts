import { describe, expect, it } from "vitest";
import {
  type AnalyticsEvent,
  batchSchema,
  MAX_EVENTS_PER_LOAD,
  parseRef,
  referrerHost,
} from "../../src/lib/analytics/events";
import {
  cookieFrom,
  hasNotrack,
  isBot,
  isProductionHost,
  notrackParam,
} from "../../src/lib/analytics/exclusions";
import { chunkBodies, EMPTY_QUEUE, enqueue, MAX_CHUNK_BYTES } from "../../src/lib/analytics/queue";

const VISIT_ID = "3f1c2a4e-8b7d-4c6e-9a5f-1d2e3f4a5b6c";

const EVERY_EVENT: AnalyticsEvent[] = [
  { name: "visit", ref: "cv", referrer_host: "www.linkedin.com", returning: false },
  { name: "question", via: "suggestion", suggestion: 2, nth: 1, text: "Is Julian open to remote?" },
  { name: "answer", nth: 1, sources: 0, outcome: "visitor_limit" },
  { name: "sources_opened" },
  { name: "copied" },
  { name: "toy", which: "moo" },
  { name: "toy", which: "slider", slider: "wind" },
  { name: "cv_download" },
  { name: "contact_sent" },
  { name: "outbound", to: "github" },
];

const batch = (events: unknown[]) => ({ visit_id: VISIT_ID, events });

describe("batchSchema", () => {
  it("accepts every event on the list", () => {
    expect(batchSchema.safeParse(batch(EVERY_EVENT)).success).toBe(true);
  });

  it.each([
    ["an unknown event", { name: "click", target: "button" }],
    ["an extra field", { name: "copied", text: "the answer" }],
    ["an extra field on a visit", { ...EVERY_EVENT[0], user_agent: "Mozilla/5.0" }],
    ["a slider without its name", { name: "toy", which: "slider" }],
    ["a slider name on another toy", { name: "toy", which: "moo", slider: "wind" }],
    ["an unknown ref", { name: "visit", ref: "twitter", referrer_host: null, returning: true }],
    ["a question over 1,000 characters", { ...EVERY_EVENT[1], text: "a".repeat(1001) }],
    ["an unknown outcome", { name: "answer", nth: 1, sources: 2, outcome: "maybe" }],
  ])("rejects %s", (_, event) => {
    expect(batchSchema.safeParse(batch([event])).success).toBe(false);
  });

  it("rejects an empty batch, one over the cap, a bad id and extra top-level fields", () => {
    const copied = { name: "copied" };
    expect(batchSchema.safeParse(batch([])).success).toBe(false);
    expect(batchSchema.safeParse(batch(Array(MAX_EVENTS_PER_LOAD + 1).fill(copied))).success).toBe(
      false,
    );
    expect(batchSchema.safeParse({ visit_id: "1", events: [copied] }).success).toBe(false);
    expect(batchSchema.safeParse({ ...batch([copied]), ip: "203.0.113.7" }).success).toBe(false);
  });
});

describe("parseRef", () => {
  it.each([
    ["linkedin", "linkedin"],
    ["cv", "cv"],
    ["github", "github"],
    ["newsletter", "other"],
    [42, "other"],
    ["", "none"],
    [undefined, "none"],
  ])("reads %j as %s", (value, ref) => {
    expect(parseRef(value)).toBe(ref);
  });
});

describe("referrerHost", () => {
  it("keeps the hostname only", () => {
    expect(referrerHost("https://www.linkedin.com/feed/?trk=abc", "julianpalomo.dev")).toBe(
      "www.linkedin.com",
    );
  });

  it("is null without a referrer, for the site's own pages, or for something that isn't a URL", () => {
    expect(referrerHost("", "julianpalomo.dev")).toBeNull();
    expect(referrerHost("https://julianpalomo.dev/es", "julianpalomo.dev")).toBeNull();
    expect(referrerHost("not a url", "julianpalomo.dev")).toBeNull();
  });
});

describe("isProductionHost", () => {
  it("counts only julianpalomo.dev", () => {
    expect(isProductionHost("julianpalomo.dev")).toBe(true);
    for (const host of [
      "localhost",
      "www.julianpalomo.dev",
      "julianpalomo-dev.example.workers.dev",
      "feat-analytics-julianpalomo-dev.example.workers.dev",
    ]) {
      expect(isProductionHost(host)).toBe(false);
    }
  });
});

describe("isBot", () => {
  it.each([
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "facebookexternalhit/1.1",
    "WhatsApp/2.23.20.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
    "curl/8.7.1",
    "python-requests/2.32.3",
    "",
  ])("drops %j", (userAgent) => {
    expect(isBot(userAgent)).toBe(true);
  });

  it("drops a request with no user agent", () => {
    expect(isBot(null)).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  ])("counts %j", (userAgent) => {
    expect(isBot(userAgent)).toBe(false);
  });
});

describe("the notrack cookie", () => {
  it("reads `?notrack` as set, and `?notrack=0` as clear, as the router parses them", () => {
    expect(notrackParam("")).toBe("set");
    expect(notrackParam(1)).toBe("set");
    expect(notrackParam("yes")).toBe("set");
    expect(notrackParam(0)).toBe("clear");
    expect(notrackParam("0")).toBe("clear");
    expect(notrackParam(undefined)).toBeNull();
  });

  it("excludes a browser only when the cookie is 1", () => {
    expect(hasNotrack("1")).toBe(true);
    expect(hasNotrack("0")).toBe(false);
    expect(hasNotrack(undefined)).toBe(false);
  });

  it("finds the cookie in a request's Cookie header", () => {
    expect(cookieFrom("theme=dark; notrack=1; visited=1", "notrack")).toBe("1");
    expect(cookieFrom("theme=dark", "notrack")).toBeUndefined();
    expect(cookieFrom(null, "notrack")).toBeUndefined();
  });
});

describe("the client's queue", () => {
  it("stops recording after 100 events in a page load, however many were sent", () => {
    let queue = EMPTY_QUEUE;
    for (let index = 0; index < MAX_EVENTS_PER_LOAD + 20; index++) {
      queue = enqueue(queue, { name: "copied" });
      if (index === 49) queue = { ...queue, pending: [] };
    }
    expect(queue.recorded).toBe(MAX_EVENTS_PER_LOAD);
    expect(queue.pending).toHaveLength(MAX_EVENTS_PER_LOAD - 50);
  });

  it("splits a flush into bodies under the size limit, in order, each a valid batch", () => {
    const events: AnalyticsEvent[] = Array.from({ length: 100 }, (_, index) => ({
      name: "question",
      via: "typed",
      suggestion: null,
      nth: index + 1,
      text: "é".repeat(1000),
    }));
    const bodies = chunkBodies(VISIT_ID, events);
    expect(bodies.length).toBeGreaterThan(1);
    const sent = bodies.flatMap(({ body, count }) => {
      expect(new TextEncoder().encode(body).length).toBeLessThanOrEqual(MAX_CHUNK_BYTES);
      const parsed = batchSchema.parse(JSON.parse(body));
      expect(parsed.events).toHaveLength(count);
      return parsed.events;
    });
    expect(sent).toEqual(events);
  });

  it("sends a small flush as one body", () => {
    expect(chunkBodies(VISIT_ID, EVERY_EVENT)).toHaveLength(1);
    expect(chunkBodies(VISIT_ID, [])).toEqual([]);
  });
});
