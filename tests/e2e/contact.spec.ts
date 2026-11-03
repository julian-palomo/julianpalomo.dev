import { expect, type Page, test } from "@playwright/test";
import { chatErrorBody } from "../../src/lib/bot/chat-error";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";

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

test("from 1024px the buttons sit under the intro, and on a phone above the footer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Download CV" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("button", { name: "Contact" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const link = page.getByRole("link", { name: "Download CV" });
  await expect(link).toHaveCount(1);
  await expect(page.getByRole("banner").getByRole("link", { name: "Download CV" })).toHaveCount(0);
  // After the chat and before the footer.
  const chat = await page.getByRole("main").boundingBox();
  const at = await link.boundingBox();
  const footer = await page.getByRole("contentinfo").boundingBox();
  if (!chat || !at || !footer) throw new Error("not on screen");
  expect(at.y).toBeGreaterThanOrEqual(chat.y + chat.height);
  expect(at.y + at.height).toBeLessThanOrEqual(footer.y);
});

test("on a phone the buttons are centred; from 1024px they keep the intro's left edge", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // Every wrapped row of the row's items, left and right gaps within the page.
  const gaps = await page
    .getByRole("link", { name: "Download CV" })
    .locator("..")
    .evaluate((row) => {
      const rows = new Map<number, { left: number; right: number }>();
      for (const item of row.children) {
        const at = item.getBoundingClientRect();
        const top = Math.round(at.top);
        const seen = rows.get(top) ?? { left: at.left, right: at.right };
        rows.set(top, {
          left: Math.min(seen.left, at.left),
          right: Math.max(seen.right, at.right),
        });
      }
      return [...rows.values()].map((each) => ({
        left: each.left,
        right: innerWidth - each.right,
      }));
    });
  expect(gaps.length).toBeGreaterThan(0);
  for (const gap of gaps) expect(Math.abs(gap.left - gap.right)).toBeLessThan(2);

  await page.setViewportSize({ width: 1280, height: 800 });
  const intro = await page.getByText(en.intro).boundingBox();
  const atIntro = await page
    .getByRole("banner")
    .getByRole("link", { name: "Download CV" })
    .boundingBox();
  if (!intro || !atIntro) throw new Error("not on screen");
  expect(Math.abs(atIntro.x - intro.x)).toBeLessThan(1);
});

test("the form says Julian reads and replies to every message, in both languages", async ({
  page,
}) => {
  await page.goto("/");
  await openContact(page);
  await expect(dialog(page)).toContainText(en.contactSubtitle);
  await page.goto("/es");
  await expect(async () => {
    await page.getByRole("button", { name: es.contactOpen, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 5000 });
  await expect(page.getByRole("dialog")).toContainText(es.contactSubtitle);
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

/** Counts the sounds started, leaving out the one-sample buffer Howler starts to unlock audio. */
async function countSounds(page: Page) {
  await page.addInitScript(() => {
    const counted = window as unknown as { soundsStarted: number };
    counted.soundsStarted = 0;
    const { start } = AudioBufferSourceNode.prototype;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if ((this.buffer?.length ?? 0) > 1) counted.soundsStarted += 1;
      return start.apply(this, args);
    };
  });
}

const soundsStarted = (page: Page) =>
  page.evaluate(() => (window as unknown as { soundsStarted: number }).soundsStarted);

/** Sends a filled-in form once the entrance is over, so the tap that opens it makes no moo of its own. */
async function sendMessage(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-entrance]")).toHaveCount(0);
  await openContact(page);
  await fillIn(page);
  await expect(dialog(page).locator('[name="cf-turnstile-response"]')).toHaveValue(/DUMMY/);
  await dialog(page).getByRole("button", { name: "Send message" }).click();
  await expect(dialog(page).getByRole("status")).toBeVisible();
}

test("with sound on, a sent message makes the cow moo once, then lick", async ({ page }) => {
  await countSounds(page);
  await sendMessage(page);
  await expect.poll(() => soundsStarted(page)).toBe(1);
  await expect(page.locator(".edge-lift")).toHaveAttribute("data-state", "satisfied");
});

test("with sound off, a sent message only licks", async ({ page, context }) => {
  await context.addCookies([{ name: "sound", value: "off", url: "http://localhost:4173" }]);
  await countSounds(page);
  await sendMessage(page);
  await expect(page.locator(".edge-lift")).toHaveAttribute("data-state", "satisfied");
  expect(await soundsStarted(page)).toBe(0);
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
