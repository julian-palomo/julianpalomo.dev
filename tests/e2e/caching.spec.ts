import { expect, test } from "@playwright/test";

// public/_headers (docs/performance.md): files with a hash in their name are
// cached for a year; files that keep their name when they change keep
// Workers' default, so a browser always checks them.

const longLived = "public, max-age=31536000, immutable";

test("the hashed files under /assets/ are cached for a year", async ({ page, request }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
  await page.goto("/");
  const assets = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLLinkElement>(
        'link[rel="modulepreload"], link[rel="stylesheet"]',
      ),
    ]
      .map((link) => new URL(link.href).pathname)
      .filter((path) => path.startsWith("/assets/")),
  );
  expect(assets.length).toBeGreaterThan(0);
  for (const path of assets) {
    const response = await request.get(path);
    expect(response.headers()["cache-control"], path).toBe(longLived);
  }
});

test("files that keep their name when they change are checked on every load", async ({
  request,
}) => {
  for (const path of ["/sounds/sprite.webm", "/images/julian.png", "/cv/Julian-Palomo-CV.pdf"]) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(response.headers()["cache-control"], path).not.toContain("immutable");
  }
});
