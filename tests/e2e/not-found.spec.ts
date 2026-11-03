import { expect, test } from "@playwright/test";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";

// The page an unknown URL gets (DESIGN.md section 18). The error page has no
// test: nothing in the site can be made to throw without code written for it.

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
});

for (const [path, home, messages] of [
  ["/no-such-page", "/", en],
  ["/es/no-such-page", "/es", es],
] as const) {
  test(`${path} is a 404 in its language, with the way back to the chat`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", messages === es ? "es" : "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.notFound.title);
    await expect(page.getByText(messages.notFound.line)).toBeVisible();
    // The cow at the end of the page reads its notebook, as if it had looked.
    await expect(page.locator(".edge-lift")).toHaveAttribute("data-state", "reading");
    await page.getByRole("link", { name: messages.askTheCow }).click();
    await expect(page).toHaveURL((url) => url.pathname === home);
    await expect(page.getByLabel(messages.questionLabel)).toBeFocused();
  });
}
