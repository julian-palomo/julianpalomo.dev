import { expect, type Page, test } from "@playwright/test";
import { LONG_WAIT_MS } from "../../src/components/chat/chat-view";
import { DEMO_ANSWER_INTRO } from "../../src/lib/bot/demo";
import { en } from "../../src/lib/i18n/en";

// The wait before an answer's first word (DESIGN.md section 10). Demo mode
// calls get_claims with no filter, which returns every confirmed claim, and
// holds the words back 3.5s after it, past the long wait's 3s.

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
});

const pill = (page: Page) => page.getByTestId("wait-line");
const chips = (page: Page) => page.getByRole("list", { name: en.waitChipsLabel });
const answerText = (page: Page) => page.getByTestId("answer-text").last();

async function ask(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
  const input = page.getByLabel("Your question");
  await input.fill("What did Julian do at Cazoo?");
  await input.press("Enter");
}

test("the pill counts the facts it's reading, with at most five chips and the rest counted", async ({
  page,
}) => {
  await ask(page);
  await expect(pill(page)).toHaveText(/^Reading \d+ confirmed facts…$/);
  const items = chips(page).getByRole("listitem");
  await expect(items).toHaveCount(6);
  await expect(items.last()).toHaveText(/^\+\d+ more$/);
  // The "+N more" chip counts what the five leave out.
  const total = Number((await pill(page).textContent())?.match(/\d+/)?.[0]);
  const more = Number((await items.last().textContent())?.match(/\d+/)?.[0]);
  expect(more).toBe(total - 5);
});

test("the pill and the chips go once the first word is on screen", async ({ page }) => {
  await ask(page);
  await expect(chips(page)).toBeVisible();
  await expect(answerText(page)).toContainText(DEMO_ANSWER_INTRO.split(" ")[0] ?? "", {
    timeout: 10_000,
  });
  // After their 150ms fade.
  await expect(chips(page)).toHaveCount(0, { timeout: 1000 });
  await expect(pill(page)).toHaveCount(0);
});

test("the first word starts where it stays: the pill and chips leave the flow as it comes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ask(page);
  await expect(chips(page)).toBeVisible();
  const text = answerText(page);
  await expect(text).not.toBeEmpty({ timeout: 10_000 });
  const first = await text.boundingBox();
  await expect(chips(page)).toHaveCount(0, { timeout: 1000 });
  const after = await text.boundingBox();
  if (!first || !after) throw new Error("not on screen");
  expect(Math.abs(after.y - first.y)).toBeLessThan(1);
});

test("Stop during the wait removes the pill and the chips at once", async ({ page }) => {
  await ask(page);
  await expect(chips(page)).toBeVisible();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(chips(page)).toHaveCount(0, { timeout: 100 });
  await expect(pill(page)).toHaveCount(0);
});

test("the chat announces the answer starting once, and nothing per chip", async ({ page }) => {
  await ask(page);
  await expect(chips(page)).toBeVisible();
  const announcer = page.getByTestId("chat-announcer");
  await expect(announcer).toHaveText(en.answering);
  await expect(chips(page)).not.toHaveAttribute("aria-live");
});

test("with reduced motion the chips simply appear and the line doesn't sweep", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ask(page);
  await expect(chips(page)).toBeVisible();
  const moving = await chips(page).evaluate((list) => list.getAnimations({ subtree: true }).length);
  expect(moving).toBe(0);
  const sweep = page.locator(".wait-sweep").first();
  expect(await sweep.evaluate((element) => getComputedStyle(element).display)).toBe("none");
});

const cow = (page: Page) => page.locator(".edge-lift");
const notebookOpacity = (page: Page) =>
  page.locator(".edge-cow .notebook").evaluate((element) => getComputedStyle(element).opacity);

test("after a long wait with no word, the pill says it's still chewing and the cow reads", async ({
  page,
}) => {
  await page.clock.install();
  await ask(page);
  await expect(pill(page)).toBeVisible();
  await expect(cow(page)).toHaveAttribute("data-state", "thinking");
  expect(await notebookOpacity(page)).toBe("0");
  await page.clock.fastForward(LONG_WAIT_MS);
  await expect(pill(page)).toHaveText(en.chewingItOver);
  await expect(cow(page)).toHaveAttribute("data-state", "reading");
  await expect.poll(() => notebookOpacity(page)).toBe("1");
  // The notebook goes, and the cow talks, once the first word is on screen.
  await expect(answerText(page)).not.toBeEmpty();
  await expect(cow(page)).toHaveAttribute("data-state", "talking");
  expect(await notebookOpacity(page)).toBe("0");
});

test("with reduced motion the notebook simply shows, open and still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await ask(page);
  await expect(pill(page)).toBeVisible();
  await page.clock.fastForward(LONG_WAIT_MS);
  await expect(cow(page)).toHaveAttribute("data-state", "reading");
  expect(await notebookOpacity(page)).toBe("1");
  const moving = await page
    .locator(".edge-cow .notebook")
    .evaluate((element) => element.getAnimations({ subtree: true }).length);
  expect(moving).toBe(0);
});
