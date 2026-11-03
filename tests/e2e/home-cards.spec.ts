import { expect, type Page, test } from "@playwright/test";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";
import { site } from "../../src/lib/site";

// The home page's actions and places (DESIGN.md sections 14 and 18): a row
// with the three actions, the inner pages as cards, and a view transition
// between pages (section 11).

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
});

const cards = (page: Page, messages: typeof en = en) =>
  page.getByRole("navigation", { name: messages.pagesLabel });

/** The row the visible CV pill sits in: the banner's from 1024px, the one under the chat below. */
const actionRow = (page: Page, messages: typeof en) =>
  page.getByRole("link", { name: messages.downloadCv }).locator("..");

const githubPill = (page: Page, messages: typeof en) =>
  actionRow(page, messages).getByRole("link", { name: /^GitHub/ });

for (const [home, messages] of [
  ["/", en],
  ["/es", es],
] as const) {
  for (const width of [320, 360, 390, 768, 1024, 1280]) {
    test(`at ${width}px ${home}'s row holds the three actions and nothing else`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(home);
      // At rest: the entrance moves the row while it plays.
      await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
      const row = actionRow(page, messages);
      await expect(row.locator("> *")).toHaveCount(3);
      await expect(row.getByRole("link")).toHaveCount(2);
      const boxes = await Promise.all([
        row.getByRole("link", { name: messages.downloadCv }).boundingBox(),
        row.getByRole("button", { name: messages.contactOpen }).boundingBox(),
        githubPill(page, messages).boundingBox(),
      ]);
      const [cv, contact, github] = boxes;
      if (!cv || !contact || !github) throw new Error("not on screen");
      if (width >= 390) {
        // One line, desktop's 300px column included.
        expect(Math.abs(cv.y - contact.y)).toBeLessThan(1);
        expect(Math.abs(cv.y - github.y)).toBeLessThan(1);
      } else if (width >= 360) {
        // CV and Contact share a line; GitHub may wrap under them.
        expect(Math.abs(cv.y - contact.y)).toBeLessThan(1);
      } else {
        // Stacked, all as wide as the row.
        expect(contact.y).toBeGreaterThan(cv.y + cv.height - 1);
        expect(github.y).toBeGreaterThan(contact.y + contact.height - 1);
        expect(Math.abs(cv.width - contact.width)).toBeLessThan(1);
        expect(Math.abs(cv.width - github.width)).toBeLessThan(1);
      }
      if (width >= 1024) {
        // In the intro's column, clear of the chat card beside it.
        const chat = await page.getByRole("main").boundingBox();
        if (!chat) throw new Error("not on screen");
        expect(github.x + github.width).toBeLessThan(chat.x);
      }
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll).toBeLessThanOrEqual(width);
    });
  }

  test(`${home}'s GitHub pill opens Julian's GitHub in a new tab`, async ({ page }) => {
    await page.goto(home);
    const pill = githubPill(page, messages);
    await expect(pill).toBeVisible();
    await expect(pill).toHaveAttribute("href", site.links.github);
    await expect(pill).toHaveAttribute("target", "_blank");
    await expect(pill).toHaveAttribute("aria-label", `GitHub${messages.opensInNewTab}`);
  });
}

test("the GitHub pill records an outbound event", async ({ page, context }) => {
  const sent: { events: { name: string; to?: string }[] }[] = [];
  await page.route("**/api/events", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  // The new tab goes nowhere, so the run never reaches GitHub.
  await context.route("https://github.com/**", (route) => route.fulfill({ body: "" }));
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
  const tab = context.waitForEvent("page");
  await githubPill(page, en).click();
  await (await tab).close();
  await expect
    .poll(async () => {
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      return sent.flatMap((body) => body.events).filter((event) => event.name === "outbound");
    })
    .toEqual([{ name: "outbound", to: "github" }]);
});

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

/** Records, every frame, the view-transition pseudo-elements that animate. */
async function watchTransitions(page: Page) {
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
}

/** The pseudo-elements seen since `watchTransitions`, once a 250ms transition has had time to end. */
async function seenTransitions(page: Page): Promise<string[]> {
  await page.waitForTimeout(500);
  return page.evaluate(() => [
    ...((window as unknown as { seenTransitions: Set<string> }).seenTransitions ?? []),
  ]);
}

/** Follows the Projects card and returns the view-transition pseudo-elements that animated. */
async function transitionsOnCardClick(page: Page): Promise<string[]> {
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
  await watchTransitions(page);
  await expect(async () => {
    await cards(page).getByRole("link", { name: en.projectsTitle }).click();
    await expect(page).toHaveURL(/\/projects$/, { timeout: 1000 });
  }).toPass({ timeout: 5000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.projectsTitle);
  return seenTransitions(page);
}

test("following a card runs a view transition", async ({ page }) => {
  expect(await transitionsOnCardClick(page)).not.toEqual([]);
});

test("with reduced motion, following a card runs none", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await transitionsOnCardClick(page)).toEqual([]);
});

// The link lands on `/#ask`, and the hash is then dropped: that tidy-up must
// not start a transition of its own, which would skip this one and throw.
test('"← Ask the cow" runs a view transition and focuses the composer, with no error', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  await page.goto("/projects");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.projectsTitle);
  await watchTransitions(page);
  await expect(async () => {
    await page.getByRole("link", { name: en.askTheCow }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 1000 });
  }).toPass({ timeout: 5000 });
  await expect(page.getByLabel("Your question")).toBeFocused();
  expect(await seenTransitions(page)).not.toEqual([]);
  expect(errors).toEqual([]);
});
