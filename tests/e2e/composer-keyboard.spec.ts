import { expect, type Page, test } from "@playwright/test";

// The composer, fixed to the bottom of a phone, rises only for a keyboard:
// while its box has focus, and by more than an address bar covers
// (keyboardInset in src/components/chat/chat-view.ts).
// Playwright's phones have no address bar that comes and goes, so the visual
// viewport is replaced with one whose height the test sets: 56px short, as
// Opera and Brave on Android measured mid-scroll.

test.use({ viewport: { width: 390, height: 760 } });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    let height = window.innerHeight;
    Object.defineProperties(viewport, {
      height: { get: () => height },
      width: { get: () => window.innerWidth },
      offsetTop: { get: () => 0 },
      offsetLeft: { get: () => 0 },
      pageTop: { get: () => window.scrollY },
      pageLeft: { get: () => 0 },
      scale: { get: () => 1 },
    });
    Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true });
    Object.assign(window, {
      setVisualHeight: (next: number) => {
        height = next;
        viewport.dispatchEvent(new Event("resize"));
      },
    });
  });
});

const form = (page: Page) => page.getByLabel("Your question").locator("xpath=ancestor::form");

function shortenVisualViewport(page: Page, by: number) {
  return page.evaluate((by) => {
    (window as unknown as { setVisualHeight: (height: number) => void }).setVisualHeight(
      window.innerHeight - by,
    );
  }, by);
}

async function gapUnder(page: Page) {
  const box = await form(page).boundingBox();
  if (!box) throw new Error("not on screen");
  return 760 - (box.y + box.height);
}

test("a shorter visual viewport without focus leaves the composer on the bottom edge", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
  await shortenVisualViewport(page, 56);
  await expect(form(page)).toHaveCSS("bottom", "0px");
  expect(await gapUnder(page)).toBeLessThan(1);
});

test("with focus but the keyboard closed, the composer stays on the bottom edge", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
  // After a question the box keeps its focus, and closing Android's keyboard
  // with the back gesture may not blur it; the address bar still comes and goes.
  await page.getByLabel("Your question").focus();
  await shortenVisualViewport(page, 56);
  await expect(form(page)).toHaveCSS("bottom", "0px");
  expect(await gapUnder(page)).toBeLessThan(1);
});

test("with focus in the box, the composer rises by what the keyboard covers", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
  await page.getByLabel("Your question").focus();
  await shortenVisualViewport(page, 300);
  await expect(form(page)).toHaveCSS("bottom", "300px");
  // Focus leaves, the keyboard goes: back on the bottom edge.
  await page.getByLabel("Your question").blur();
  await expect(form(page)).toHaveCSS("bottom", "0px");
});
