import { expect, type Locator, type Page, test } from "@playwright/test";

// The hand on everything that can be pressed, and the arrow on what can't
// (DESIGN.md section 4), at 1280px, where there's a pointer to see it.

test.use({ viewport: { width: 1280, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
});

const cursor = (element: Locator) => element.evaluate((node) => getComputedStyle(node).cursor);
const gear = (page: Page) => page.getByRole("button", { name: "Play with the sky", exact: true });

test("buttons, the cow and a suggestion show the hand; a disabled Send and the box don't", async ({
  page,
}) => {
  await page.goto("/");
  const send = page.getByRole("button", { name: "Send" });
  const box = page.getByRole("textbox", { name: "Your question" });
  await expect(send).toBeDisabled();
  expect(await cursor(send)).not.toBe("pointer");
  expect(await cursor(box)).not.toBe("pointer");

  await box.fill("Where did Julian study?");
  await expect(send).toBeEnabled();
  expect(await cursor(send)).toBe("pointer");
  for (const pressable of [
    page.getByRole("button", { name: "Contact", exact: true }),
    page.getByRole("button", { name: "Pat the cow" }),
    page.locator("[data-suggestion]").first(),
  ]) {
    expect(await cursor(pressable)).toBe("pointer");
  }
  // The gear spins in 2s after the short entrance.
  await expect(gear(page)).toBeVisible({ timeout: 8000 });
  expect(await cursor(gear(page))).toBe("pointer");
});

test("a season in the sky panel shows the hand", async ({ page }) => {
  await page.goto("/");
  await expect(gear(page)).toBeVisible({ timeout: 8000 });
  await gear(page).click();
  const panel = page.getByRole("dialog", { name: "Play with the sky" });
  const winter = panel
    .locator("label")
    .filter({ has: page.getByRole("radio") })
    .first();
  expect(await cursor(winter)).toBe("pointer");
});

test("a stop on How it's built's ring shows the hand", async ({ page }) => {
  await page.goto("/how-its-built");
  const stop = page.getByRole("button", { name: "Claude", exact: true });
  expect(await cursor(stop)).toBe("pointer");
});

test("the contact form's Send keeps the arrow while the message is sending", async ({ page }) => {
  // The server function never answers, so the form stays in its sending state.
  await page.route("**/_serverFn/**", () => {});
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0);
  const dialog = page.getByRole("dialog", { name: "Write to Julian" });
  await expect(async () => {
    await page.getByRole("button", { name: "Contact", exact: true }).click();
    await expect(dialog).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 5000 });
  await dialog.getByLabel("Name").fill("Ada");
  await dialog.getByLabel("Email").fill("ada@example.org");
  await dialog.getByLabel("Message").fill("Hello Julian, I'd like to talk about a role.");
  await expect(dialog.locator('[name="cf-turnstile-response"]')).toHaveValue(/DUMMY/);
  const send = dialog.getByRole("button", { name: "Send message" });
  expect(await cursor(send)).toBe("pointer");
  await send.click();
  const sending = dialog.getByRole("button", { name: "Sending…" });
  await expect(sending).toHaveAttribute("aria-disabled", "true");
  expect(await cursor(sending)).not.toBe("pointer");
});
