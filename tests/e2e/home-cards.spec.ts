import { expect, type Page, test } from "@playwright/test";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";

// The home page's actions and places (DESIGN.md sections 14 and 18): a row
// with the two actions, the inner pages as cards, and a view transition
// between pages (section 11).

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
});

const cards = (page: Page, messages: typeof en = en) =>
  page.getByRole("navigation", { name: messages.pagesLabel });

/** The row the visible "Download CV" sits in: the banner's from 1024px, the one under the chat below. */
const actionRow = (page: Page, messages: typeof en) =>
  page.getByRole("link", { name: messages.downloadCv }).locator("..");

for (const [home, messages] of [
  ["/", en],
  ["/es", es],
] as const) {
  for (const width of [320, 360, 390, 768, 1024, 1280]) {
    test(`at ${width}px ${home}'s row holds the two actions and nothing else`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(home);
      // At rest: the entrance moves the row while it plays.
      await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
      const row = actionRow(page, messages);
      await expect(row.locator("> *")).toHaveCount(2);
      await expect(row.getByRole("link")).toHaveCount(1);
      const cv = await row.getByRole("link", { name: messages.downloadCv }).boundingBox();
      const contact = await row.getByRole("button", { name: messages.contactOpen }).boundingBox();
      if (!cv || !contact) throw new Error("not on screen");
      if (width >= 360) {
        // One line, desktop's 300px column included.
        expect(Math.abs(cv.y - contact.y)).toBeLessThan(1);
      } else {
        // Stacked, both as wide as the row.
        expect(contact.y).toBeGreaterThan(cv.y + cv.height - 1);
        expect(Math.abs(cv.width - contact.width)).toBeLessThan(1);
      }
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll).toBeLessThanOrEqual(width);
    });
  }
}

for (const [home, messages, prefix] of [
  ["/", en, ""],
  ["/es", es, "/es"],
] as const) {
  test(`${home}'s cards link to the inner pages`, async ({ page }) => {
    await page.goto(home);
    await expect(cards(page, messages).getByRole("link")).toHaveCount(2);
    for (const [title, line, path] of [
      [messages.projectsTitle, messages.projectsCard, "projects"],
      [messages.howItsBuiltTitle, messages.howItsBuiltCard, "how-its-built"],
    ] as const) {
      const card = cards(page, messages).getByRole("link", { name: title });
      await expect(card).toHaveAttribute("href", `${prefix}/${path}`);
      await expect(card).toContainText(line);
    }
  });
}

test("the cards sit side by side from 640px and stack below it", async ({ page }) => {
  const tops = () =>
    cards(page)
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().top)));
  await page.setViewportSize({ width: 640, height: 800 });
  await page.goto("/");
  const [first, second] = await tops();
  expect(first).toBe(second);
  await page.setViewportSize({ width: 639, height: 800 });
  await expect.poll(async () => (await tops())[1] ?? 0).toBeGreaterThan(first ?? 0);
});

test("the home footer has no page links; the inner pages' footers do", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: en.projectsTitle }),
  ).toHaveCount(0);
  for (const path of ["/projects", "/how-its-built"]) {
    await page.goto(path);
    for (const title of [en.projectsTitle, en.howItsBuiltTitle]) {
      await expect(page.getByRole("contentinfo").getByRole("link", { name: title })).toBeVisible();
    }
  }
});

test('a card opens its page, and "Ask the cow" comes back with no entrance', async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
  await expect(async () => {
    await cards(page).getByRole("link", { name: en.howItsBuiltTitle }).click();
    await expect(page).toHaveURL(/\/how-its-built$/, { timeout: 1000 });
  }).toPass({ timeout: 5000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.howItsBuiltTitle);
  await expect(async () => {
    await page.getByRole("link", { name: en.askTheCow }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 1000 });
  }).toPass({ timeout: 5000 });
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 300 });
});

/**
 * Follows the Projects card and returns the view-transition pseudo-elements
 * that animated, read from `document.getAnimations()` every frame.
 */
async function transitionsOnCardClick(page: Page): Promise<string[]> {
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
  await page.evaluate(() => {
    const seen = new Set<string>();
    Object.assign(window, { seenTransitions: seen });
    const look = () => {
      for (const animation of document.getAnimations()) {
        const effect = animation.effect;
        if (
          effect instanceof KeyframeEffect &&
          effect.pseudoElement?.startsWith("::view-transition")
        ) {
          seen.add(effect.pseudoElement);
        }
      }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
  await expect(async () => {
    await cards(page).getByRole("link", { name: en.projectsTitle }).click();
    await expect(page).toHaveURL(/\/projects$/, { timeout: 1000 });
  }).toPass({ timeout: 5000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.projectsTitle);
  // Long enough for a 250ms transition to have started and ended.
  await page.waitForTimeout(500);
  return page.evaluate(() => [
    ...((window as unknown as { seenTransitions: Set<string> }).seenTransitions ?? []),
  ]);
}

test("following a card runs a view transition", async ({ page }) => {
  expect(await transitionsOnCardClick(page)).not.toEqual([]);
});

test("with reduced motion, following a card runs none", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await transitionsOnCardClick(page)).toEqual([]);
});
