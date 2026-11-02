import { describe, expect, it, vi } from "vitest";
import { handleEvents } from "../../src/lib/analytics/endpoint";
import type { AnalyticsEvent } from "../../src/lib/analytics/events";
import type { EventStore } from "../../src/lib/analytics/store";

const VISIT_ID = "3f1c2a4e-8b7d-4c6e-9a5f-1d2e3f4a5b6c";
const BROWSER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const VISIT: AnalyticsEvent = { name: "visit", ref: "cv", referrer_host: null, returning: false };

function post({
  host = "julianpalomo.dev",
  userAgent = BROWSER,
  cookie,
  body = JSON.stringify({ visit_id: VISIT_ID, events: [VISIT] }),
}: {
  host?: string;
  userAgent?: string;
  cookie?: string;
  body?: string;
} = {}) {
  const headers: Record<string, string> = { "user-agent": userAgent };
  if (cookie !== undefined) headers.cookie = cookie;
  return new Request(`https://${host}/api/events`, { method: "POST", headers, body });
}

function setup({ db = true, prune = vi.fn(async () => {}) } = {}) {
  const record = vi.fn(
    async (_visitId: string, events: readonly AnalyticsEvent[]) => events.length,
  );
  const store: EventStore = { record, prune };
  const pending: Promise<unknown>[] = [];
  const deps = {
    waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    now: () => 1_700_000_000_000,
    createStore: () => (db ? store : null),
  };
  const settle = () => Promise.all(pending);
  return { record, prune, deps, settle };
}

describe("handleEvents", () => {
  it("stores a valid batch from a browser on the production host, then prunes, after answering 204", async () => {
    const { record, prune, deps, settle } = setup();
    const response = await handleEvents(post(), { DB: {} }, deps);
    expect(response.status).toBe(204);
    await settle();
    expect(record).toHaveBeenCalledWith(VISIT_ID, [VISIT], 1_700_000_000_000);
    expect(prune).toHaveBeenCalledWith(1_700_000_000_000);
  });

  it.each([
    ["isn't JSON", post({ body: "{" })],
    [
      "holds an unknown event",
      post({ body: JSON.stringify({ visit_id: VISIT_ID, events: [{ name: "click" }] }) }),
    ],
    [
      // A valid batch, padded with whitespace JSON allows, so only its size is wrong.
      "is over 400 KB",
      post({
        body: `${JSON.stringify({ visit_id: VISIT_ID, events: [VISIT] })}${" ".repeat(400_001)}`,
      }),
    ],
  ])(
    "answers 400 to a body that %s, before any other check, and stores nothing",
    async (_, request) => {
      const { record, deps, settle } = setup();
      // The schema comes first, so even a bot off the production host gets the 400.
      const response = await handleEvents(request, {}, deps);
      expect(response.status).toBe(400);
      await settle();
      expect(record).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["off the production host", post({ host: "localhost" })],
    ["on a preview", post({ host: "feat-analytics-julianpalomo-dev.example.workers.dev" })],
    ["from a bot", post({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)" })],
    ["from a headless browser", post({ userAgent: "Mozilla/5.0 HeadlessChrome/131.0.0.0" })],
    ["with the notrack cookie", post({ cookie: "theme=dark; notrack=1" })],
  ])("answers 204 and stores nothing for a batch %s, even with no D1", async (_, request) => {
    const { record, prune, deps, settle } = setup({ db: false });
    const response = await handleEvents(request, {}, deps);
    expect(response.status).toBe(204);
    await settle();
    expect(record).not.toHaveBeenCalled();
    expect(prune).not.toHaveBeenCalled();
  });

  it("answers 503 on the production host without a D1 binding", async () => {
    const { deps } = setup({ db: false });
    expect((await handleEvents(post(), {}, deps)).status).toBe(503);
  });

  it("keeps the stored events when the prune fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { record, deps, settle } = setup({
      prune: vi.fn(async () => {
        throw new Error("D1 is down");
      }),
    });
    expect((await handleEvents(post(), { DB: {} }, deps)).status).toBe(204);
    await settle();
    expect(record).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith("events: prune failed", expect.any(Error));
    error.mockRestore();
  });
});
