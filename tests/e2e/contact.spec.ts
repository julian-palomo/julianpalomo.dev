import { expect, type Page, test } from "@playwright/test";
import { chatErrorBody } from "../../src/lib/bot/chat-error";

// The CV and the contact form (DESIGN.md section 14). The e2e build sets
// CONTACT_DEMO (wrangler.jsonc), so the form renders Turnstile with
// Cloudflare's always-passing test key, the server checks the dummy token
// with the test secret, and nothing is sent.

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
});

const dialog = (page: Page) => page.getByRole("dialog", { name: "Write to Julian" });
const contactButton = (page: Page) => page.getByRole("button", { name: "Contact", exact: true });

/** Opens the form with "Contact", retried because a press before hydration does nothing. */
async function openContact(page: Page) {
  await expect(async () => {
    await contactButton(page).click();
    await expect(dialog(page)).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 5000 });
}

async function fillIn(page: Page, email = "ada@example.org") {
  const form = dialog(page);
  await form.getByLabel("Name").fill("Ada");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Message").fill("Hello Julian, I'd like to talk about a role.");
}

test("Download CV points to the PDF, which is served", async ({ page, request }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Download CV" });
  await expect(link).toHaveAttribute("href", "/cv/Julian-Palomo-CV.pdf");
  await expect(link).toHaveAttribute("download", "");
  const pdf = await request.get("/cv/Julian-Palomo-CV.pdf");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
});

test("Turnstile loads only when the form opens", async ({ page }) => {
  const turnstile: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("challenges.cloudflare.com")) turnstile.push(request.url());
  });
  await page.goto("/");
  await expect(contactButton(page)).toBeVisible();
  expect(turnstile).toEqual([]);
  await openContact(page);
  await expect.poll(() => turnstile.length).toBeGreaterThan(0);
});

test("a filled-in form is sent and thanks the visitor", async ({ page }) => {
  await page.goto("/");
  await openContact(page);
  await fillIn(page);
  // The test key passes at once and puts its dummy token in the widget's field.
  await expect(dialog(page).locator('[name="cf-turnstile-response"]')).toHaveValue(/DUMMY/);
  await dialog(page).getByRole("button", { name: "Send message" }).click();
  await expect(dialog(page).getByRole("status")).toHaveText("Thanks! Julian will get back to you.");
  // The chat's cow licks its lips, satisfied.
  await expect(page.locator(".edge-lift")).toHaveAttribute("data-state", "satisfied");
});

test("an invalid email shows its field's error and sends nothing", async ({ page }) => {
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/_serverFn/")) {
      sent.push(request.url());
    }
  });
  await page.goto("/");
  await openContact(page);
  await fillIn(page, "ada.example.org");
  await dialog(page).getByRole("button", { name: "Send message" }).click();
  const email = dialog(page).getByLabel("Email");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toBeFocused();
  await expect(dialog(page)).toContainText("That doesn't look like an email address.");
  expect(sent).toEqual([]);
});

test("Escape closes the form and focus goes back to Contact", async ({ page }) => {
  await page.goto("/");
  await openContact(page);
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(contactButton(page)).toBeFocused();
});

test("the chat's warm error opens the form with “write to me”", async ({ page }) => {
  await page.goto("/");
  await page.route("**/api/chat", (route) =>
    route.fulfill({ status: 429, json: chatErrorBody("visitor_limit") }),
  );
  await page.getByLabel("Your question").fill("One more?");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByRole("alert").getByRole("button", { name: "write to me" }).click();
  await expect(dialog(page)).toBeVisible();
});
