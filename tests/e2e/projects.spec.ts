import { expect, type Page, test } from "@playwright/test";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";

// The Projects page and the shell inner pages share (DESIGN.md section 18).

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
});

const composer = (page: Page) => page.getByLabel("Your question");

for (const [path, messages] of [
  ["/projects", en],
  ["/es/projects", es],
] as const) {
  test(`${path} renders both projects in its language`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.projectsTitle);
    // The hero's row of controls, the gear included once it has spun in.
    await expect(
      page.getByRole("button", { name: messages.playWithTheSky, exact: true }),
    ).toBeVisible({
      timeout: 6000,
    });
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(2);
    for (const [index, project] of messages.projects.entries()) {
      const card = cards.nth(index);
      await expect(card.getByRole("heading", { level: 2 })).toHaveText(project.name);
      await expect(card).toContainText(project.why);
      for (const point of project.points) await expect(card).toContainText(point.text);
      for (const link of project.links) {
        await expect(card.getByRole("link", { name: link.label })).toHaveAttribute(
          "href",
          link.href,
        );
      }
    }
  });
}

test("every screenshot loads, with its alt text and its size", async ({ page }) => {
  await page.goto("/projects");
  const images = page.getByRole("article").getByRole("img");
  await expect(images).toHaveCount(Object.keys(en.projectShots).length);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute("alt", /.+/);
    await expect(image).toHaveAttribute("width", /^\d+$/);
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
});

test("the head carries the page's own canonical and language links", async ({ request }) => {
  const html = await (await request.get("/es/projects")).text();
  expect(html).toContain('<link rel="canonical" href="https://julianpalomo.dev/es/projects"');
  expect(html).toMatch(/hreflang="en" href="https:\/\/julianpalomo\.dev\/projects"/i);
  expect(html).toContain(`<title>${es.projectsTitle} · ${es.name}</title>`);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>https://julianpalomo.dev/projects</loc>");
  expect(sitemap).toContain("<loc>https://julianpalomo.dev/es/projects</loc>");
});

test("the language toggle keeps the page and remembers the choice", async ({ page, context }) => {
  await page.goto("/projects");
  await expect(async () => {
    await page.getByRole("button", { name: en.switchLanguage.label }).click();
    await expect(page).toHaveURL(/\/es\/projects$/, { timeout: 500 });
  }).toPass({ timeout: 5000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(es.projectsTitle);
  const lang = (await context.cookies()).find(({ name }) => name === "lang");
  expect(lang?.value).toBe("es");
});

for (const [what, name] of [
  ["← Ask the cow", en.askTheCow],
  ["the cow's link at the end", en.anythingElse],
] as const) {
  test(`${what} lands on the chat with the composer focused`, async ({ page }) => {
    await page.goto("/projects");
    await expect(async () => {
      await page.getByRole("link", { name }).click();
      await expect(page).toHaveURL(/\/$/, { timeout: 1000 });
    }).toPass({ timeout: 5000 });
    await expect(composer(page)).toBeFocused();
    // The hash goes once it has done its job, so a reload doesn't focus again.
    expect(new URL(page.url()).hash).toBe("");
  });
}

test("the home page's Projects card opens the page", async ({ page }) => {
  await page.goto("/");
  const card = page
    .getByRole("navigation", { name: en.pagesLabel })
    .getByRole("link", { name: en.projectsTitle });
  await expect(card).toHaveAttribute("href", "/projects");
  await expect(async () => {
    await card.click();
    await expect(page).toHaveURL(/\/projects$/, { timeout: 1000 });
  }).toPass({ timeout: 5000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.projectsTitle);
});

for (const theme of ["light", "dark"] as const) {
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`no horizontal scroll at ${width}px in the ${theme} theme`, async ({
      page,
      context,
      baseURL,
    }) => {
      const until = Date.now() + 24 * 60 * 60 * 1000;
      await context.addCookies([{ name: "theme", value: `${theme}.${until}`, url: baseURL ?? "" }]);
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/projects");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll).toBeLessThanOrEqual(width);
    });
  }
}

// The entrance plays only on a page load's first page (src/lib/page-load.ts):
// the home page reached by a client navigation starts at rest, chat and all.
async function backToTheChat(page: Page) {
  await expect(async () => {
    await page.getByRole("link", { name: en.askTheCow }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 1000 });
  }).toPass({ timeout: 5000 });
  // At once: even the short entrance would still be playing 300ms in.
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 300 });
  await expect(page.getByText(en.greeting, { exact: true })).toBeVisible({ timeout: 500 });
  await expect(page.getByRole("list", { name: en.suggestionsLabel })).toBeVisible({ timeout: 500 });
}

test("home, Projects, then back home: the entrance doesn't play again", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
  await expect(async () => {
    await page
      .getByRole("navigation", { name: en.pagesLabel })
      .getByRole("link", { name: en.projectsTitle })
      .click();
    await expect(page).toHaveURL(/\/projects$/, { timeout: 1000 });
  }).toPass({ timeout: 5000 });
  await backToTheChat(page);
});

test.describe("a first visit that starts on Projects", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("going to the chat shows it at rest, with no first-visit entrance", async ({ page }) => {
    await page.goto("/projects");
    await backToTheChat(page);
  });
});
