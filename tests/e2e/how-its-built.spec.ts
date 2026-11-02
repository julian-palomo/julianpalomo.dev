import { existsSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";

// The How it's built page (DESIGN.md section 18).

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
});

const box = (page: Page, messages: typeof en) =>
  page.locator("details").filter({ hasText: messages.howItsBuilt.forDevelopers });

for (const [path, messages] of [
  ["/how-its-built", en],
  ["/es/how-its-built", es],
] as const) {
  test(`${path} renders both parts and the closed box, in its language`, async ({ page }) => {
    const copy = messages.howItsBuilt;
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.howItsBuiltTitle);
    await expect(page.getByRole("heading", { level: 2, name: copy.whatItDoes })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: copy.howIBuiltIt })).toBeVisible();
    for (const part of [copy.cow, copy.sources, copy.exam, copy.limits, copy.valley]) {
      await expect(page.getByRole("heading", { level: 3, name: part.title })).toBeVisible();
    }
    for (const step of copy.steps) {
      await expect(page.getByRole("heading", { level: 3, name: step.title })).toBeVisible();
      await expect(page.getByText(step.body)).toBeVisible();
    }
    // The drawing is decoration; its text alternative is there for screen readers.
    await expect(page.getByText(copy.flowAlt)).toHaveCount(1);
    await expect(box(page, messages)).not.toHaveAttribute("open");
  });
}

test("the box opens, with a named diagram, its steps and links to files in the repo", async ({
  page,
}) => {
  const copy = en.howItsBuilt;
  await page.goto("/how-its-built");
  await box(page, en).getByText(copy.forDevelopers).click();
  await expect(box(page, en)).toHaveAttribute("open", "");
  await expect(page.getByRole("img", { name: copy.diagramLabel })).toBeVisible();
  for (const step of copy.diagramSteps) await expect(page.getByText(step)).toBeVisible();
  const links = box(page, en).getByRole("link");
  await expect(links).toHaveCount(copy.docs.length);
  for (const doc of copy.docs) {
    const href = await box(page, en).getByRole("link", { name: doc.label }).getAttribute("href");
    expect(href).toBe(`https://github.com/julian-palomo/julianpalomo.dev/blob/main/${doc.path}`);
    // Checked against the repo itself, not over the network.
    const file = doc.path.split("#")[0] ?? "";
    expect(existsSync(file), file).toBe(true);
  }
});

test("the head and the sitemap carry the page", async ({ request }) => {
  const html = await (await request.get("/es/how-its-built")).text();
  expect(html).toContain('<link rel="canonical" href="https://julianpalomo.dev/es/how-its-built"');
  expect(html).toContain(`<title>${es.howItsBuiltTitle} · ${es.name}</title>`);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>https://julianpalomo.dev/how-its-built</loc>");
  expect(sitemap).toContain("<loc>https://julianpalomo.dev/es/how-its-built</loc>");
});

test("the home row, the footer and the Projects card link to the page", async ({ page }) => {
  await page.goto("/");
  for (const area of ["banner", "contentinfo"] as const) {
    await expect(
      page.getByRole(area).getByRole("link", { name: en.howItsBuiltTitle }),
    ).toHaveAttribute("href", "/how-its-built");
  }
  await page.goto("/projects");
  await expect(
    page.getByRole("article").nth(1).getByRole("link", { name: en.howItsBuiltTitle }),
  ).toHaveAttribute("href", "/how-its-built");
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
      await page.goto("/how-its-built");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await box(page, en).getByText(en.howItsBuilt.forDevelopers).click();
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll).toBeLessThanOrEqual(width);
    });
  }
}

// The home row now holds four links; "Cómo está hecha" is the longest.
for (const path of ["/", "/es"] as const) {
  test(`the home page's row of links fits at 320px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(320);
  });
}
