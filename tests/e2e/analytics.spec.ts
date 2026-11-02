import { expect, type Page, test } from "@playwright/test";
import { DEMO_ANSWER_INTRO } from "../../src/lib/bot/demo";

// The site's own analytics (docs/analytics.md). The page sends its events to
// /api/events with sendBeacon when it's hidden; these tests stub the endpoint
// and read what it was sent, except the last, which posts to the real one.

const BEACON = "static.cloudflareinsights.com/beacon.min.js";
const BROWSER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

type Sent = { visit_id: string; events: { name: string; [field: string]: unknown }[] };

/** Stubs /api/events and collects every body the page sends it. */
async function collectEvents(page: Page): Promise<Sent[]> {
  const sent: Sent[] = [];
  await page.route("**/api/events", async (route) => {
    sent.push(route.request().postDataJSON() as Sent);
    await route.fulfill({ status: 204 });
  });
  return sent;
}

/** Makes the page believe its tab was hidden, which flushes the queue. */
async function hide(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

const names = (sent: Sent[]) => sent.flatMap((body) => body.events.map((event) => event.name));

/**
 * Hides the page until it has sent `expected`. Right after a navigation the
 * page may not have hydrated yet, and then there's nothing to send; hiding it
 * again is harmless, since each event is sent once.
 */
async function hideUntilSent(page: Page, sent: Sent[], expected: string[]) {
  await expect
    .poll(async () => {
      await hide(page);
      return names(sent);
    })
    .toEqual(expected);
}

async function ask(page: Page, question: string) {
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: "Send" }).click();
  // Copy appears once the answer has finished typing itself out.
  await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
}

test("a question sends a visit, then the question, then its answer, as one page load", async ({
  page,
}) => {
  const sent = await collectEvents(page);
  await page.goto("/");
  await ask(page, "What has Julian worked on?");
  await expect(page.getByRole("article", { name: "Answer" })).toContainText(DEMO_ANSWER_INTRO);
  await hide(page);

  await expect.poll(() => names(sent)).toEqual(["visit", "question", "answer"]);
  const [visit, question, answer] = sent.flatMap((body) => body.events);
  expect(visit).toEqual({ name: "visit", ref: "none", referrer_host: null, returning: true });
  expect(question).toEqual({
    name: "question",
    via: "typed",
    suggestion: null,
    nth: 1,
    text: "What has Julian worked on?",
  });
  expect(answer).toEqual({ name: "answer", nth: 1, sources: 1, outcome: "done" });
  expect(new Set(sent.map((body) => body.visit_id)).size).toBe(1);
});

test("a suggestion is sent with its place in the list", async ({ page }) => {
  const sent = await collectEvents(page);
  await page.goto("/");
  await page.getByRole("button", { name: "What is Form:at?" }).click();
  await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
  await hide(page);

  await expect
    .poll(() => sent.flatMap((body) => body.events).find((event) => event.name === "question"))
    .toMatchObject({ via: "suggestion", suggestion: 1, text: "What is Form:at?" });
});

test("?ref=cv is read once, then gone from the address bar, even after a language switch", async ({
  page,
}) => {
  const sent = await collectEvents(page);
  await page.goto("/?ref=cv");
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Ver en español" }).click();
  await expect(page).toHaveURL(/\/es$/);
  await hide(page);

  await expect.poll(() => names(sent)).toContain("visit");
  const visits = sent.flatMap((body) => body.events).filter((event) => event.name === "visit");
  expect(visits).toEqual([expect.objectContaining({ ref: "cv" })]);
  expect(names(sent)).toContain("toy");
});

test("?notrack leaves the beacon out of the HTML and sends nothing, until ?notrack=0", async ({
  page,
  context,
}) => {
  const sent = await collectEvents(page);

  // Without it the e2e build renders the beacon, so its absence below means something.
  const counted = await page.goto("/");
  expect(await counted?.text()).toContain(BEACON);
  await hideUntilSent(page, sent, ["visit"]);

  const excluded = await page.goto("/?notrack");
  expect(await excluded?.text()).not.toContain(BEACON);
  await expect(page).toHaveURL(/\/$/);
  const cookie = (await context.cookies()).find((candidate) => candidate.name === "notrack");
  expect(cookie).toMatchObject({ value: "1", httpOnly: true });
  await ask(page, "What has Julian worked on?");
  await hide(page);

  // The next page load, with only the cookie, is excluded too.
  const later = await page.goto("/");
  expect(await later?.text()).not.toContain(BEACON);
  // A theme press that changes the theme proves the page has hydrated, and
  // would be a `toy` event if this browser were counted.
  const theme = await page.locator("html").getAttribute("data-theme");
  await expect(async () => {
    await page.getByRole("button", { name: /^Switch to (dark|light) theme$/ }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", theme ?? "", {
      timeout: 500,
    });
  }).toPass();
  await hide(page);

  const back = await page.goto("/?notrack=0");
  expect(await back?.text()).toContain(BEACON);
  await expect(page).toHaveURL(/\/$/);
  expect((await context.cookies()).some((candidate) => candidate.name === "notrack")).toBe(false);

  // Counted again: the first load's visit and this one's, nothing in between.
  await hideUntilSent(page, sent, ["visit", "visit"]);
});

test("the notice under the question box, in both languages", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("Questions are kept anonymously for 90 days to improve the assistant."),
  ).toBeVisible();
  await page.goto("/es");
  await expect(
    page.getByText(
      "Las preguntas se guardan de forma anónima durante 90 días para mejorar el asistente.",
    ),
  ).toBeVisible();
});

test("off the production host, /api/events stores nothing", async ({ request }) => {
  const batch = {
    visit_id: "3f1c2a4e-8b7d-4c6e-9a5f-1d2e3f4a5b6c",
    events: [{ name: "visit", ref: "cv", referrer_host: null, returning: false }],
  };
  // A browser's user agent, so only the host can drop it. The e2e build has
  // no D1 binding: a batch that got past the host check would get a 503.
  const headers = { "user-agent": BROWSER, "content-type": "text/plain" };
  const valid = await request.post("/api/events", { headers, data: JSON.stringify(batch) });
  expect(valid.status()).toBe(204);
  const invalid = await request.post("/api/events", {
    headers,
    data: JSON.stringify({ ...batch, events: [{ name: "click" }] }),
  });
  expect(invalid.status()).toBe(400);
});
