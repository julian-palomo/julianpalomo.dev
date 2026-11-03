import { expect, type Page, test } from "@playwright/test";
import { chatErrorBody } from "../../src/lib/bot/chat-error";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";

// Links to other sites open in a new tab and say so; links within the site
// don't (DESIGN.md section 15). Every link is collected by its href's
// origin, so a new one can't be missed. How it's built's links to the repo
// say they're on GitHub too, and end with the same note.

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
});

type Found = { href: string; outside: boolean; target: string | null; rel: string; name: string };

function linksOn(page: Page): Promise<Found[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map((link) => ({
      href: link.href,
      outside: new URL(link.href).origin !== location.origin,
      target: link.getAttribute("target"),
      rel: link.getAttribute("rel") ?? "",
      name: link.getAttribute("aria-label") ?? link.textContent ?? "",
    })),
  );
}

function expectRightTabs(links: Found[], note: string) {
  for (const link of links) {
    if (link.outside) {
      expect(link.target, link.href).toBe("_blank");
      expect(link.rel.split(" "), link.href).toContain("noopener");
      expect(link.name.endsWith(note), `${link.href}: ${link.name}`).toBe(true);
    } else {
      expect(link.target, link.href).toBeNull();
    }
  }
}

for (const [prefix, messages] of [
  ["", en],
  ["/es", es],
] as const) {
  for (const path of ["/", "/projects", "/how-its-built"]) {
    const url = prefix && path === "/" ? prefix : `${prefix}${path}`;
    test(`${url}: links to other sites open in a new tab, the site's own don't`, async ({
      page,
    }) => {
      await page.goto(url);
      const links = await linksOn(page);
      // Every page has both: Open-Meteo's credit in the footer, and the
      // site's own pages.
      expect(links.some((link) => link.outside)).toBe(true);
      expect(links.some((link) => !link.outside)).toBe(true);
      expectRightTabs(links, messages.opensInNewTab);
    });
  }
}

const unavailable = (page: Page) =>
  page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(chatErrorBody("unavailable")),
    }),
  );

async function askAndFail(page: Page) {
  await unavailable(page);
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0, { timeout: 5000 });
  const input = page.getByLabel("Your question");
  await input.fill("Hello?");
  await input.press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();
}

test("the error notice's LinkedIn and GitHub open in a new tab", async ({ page }) => {
  await askAndFail(page);
  const links = await linksOn(page);
  const outside = links.filter((link) => link.outside);
  expect(outside.map((link) => new URL(link.href).hostname)).toEqual(
    expect.arrayContaining(["www.linkedin.com", "github.com"]),
  );
  expectRightTabs(links, en.opensInNewTab);
});

test("the error notice's LinkedIn link still records an outbound event", async ({
  page,
  context,
}) => {
  const sent: { events: { name: string; to?: string }[] }[] = [];
  await page.route("**/api/events", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  // The new tab goes nowhere, so the run never reaches LinkedIn.
  await context.route("https://www.linkedin.com/**", (route) => route.fulfill({ body: "" }));
  await askAndFail(page);
  const tab = context.waitForEvent("page");
  await page
    .getByRole("alert")
    .getByRole("link", { name: /^LinkedIn/ })
    .click();
  await (await tab).close();
  await expect
    .poll(async () => {
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      return sent.flatMap((body) => body.events).filter((event) => event.name === "outbound");
    })
    .toEqual([{ name: "outbound", to: "linkedin" }]);
});
