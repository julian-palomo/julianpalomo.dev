import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { DEMO_ANSWER_INTRO } from "../../src/lib/bot/demo";

// Sounds (DESIGN.md section 12). Nothing here listens for real audio: an
// init script counts the sounds Howler starts through the Web Audio API.

const mute = (page: Page) => page.getByRole("button", { name: "Mute sounds" }).first();
const unmute = (page: Page) => page.getByRole("button", { name: "Turn sounds on" }).first();

async function countSounds(page: Page) {
  await page.addInitScript(() => {
    const counted = window as unknown as { soundsStarted: number };
    counted.soundsStarted = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      counted.soundsStarted += 1;
      return start.apply(this, args);
    };
  });
}

const soundsStarted = (page: Page) =>
  page.evaluate(() => (window as unknown as { soundsStarted: number }).soundsStarted);

async function ask(page: Page, question: string) {
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: "Send" }).click();
}

test("the toggle mutes sounds, says so, and remembers it across a reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(mute(page)).toBeVisible();
  await mute(page).click();
  await expect(unmute(page)).toBeVisible();
  const cookie = (await context.cookies()).find(({ name }) => name === "sound");
  expect(cookie?.value).toBe("off");

  await page.reload();
  await expect(unmute(page)).toBeVisible();
  await unmute(page).click();
  await expect(mute(page)).toBeVisible();
});

test("the server renders the muted toggle from the cookie", async ({ request }) => {
  const response = await request.get("/", { headers: { cookie: "sound=off" } });
  expect(await response.text()).toContain('aria-label="Turn sounds on"');
});

test.describe("with the sprite loaded", () => {
  // These need the sprite `pnpm sounds` builds from sounds/ (docs/sounds.md).
  // Read from disk: Playwright's loader can't import JSON without an attribute.
  const built: { slices: object } = JSON.parse(readFileSync("src/lib/sound/sprite.json", "utf8"));
  test.skip(Object.keys(built.slices).length === 0, "no sprite built yet");

  test.beforeEach(async ({ page }) => {
    await countSounds(page);
    // The sprite loads once the page is idle; wait for it before asking.
    await page.goto("/");
    await page.waitForResponse((response) => response.url().includes("/sounds/sprite."));
  });

  test("sending a question plays its sound", async ({ page }) => {
    await page.getByLabel("Your question").click();
    await ask(page, "What has Julian worked on?");
    await expect.poll(() => soundsStarted(page)).toBeGreaterThan(0);
  });

  test("with sound off, a whole question and answer play nothing", async ({ page }) => {
    await mute(page).click();
    await expect(unmute(page)).toBeVisible();
    await ask(page, "What has Julian worked on?");
    await expect(page.getByRole("article", { name: "Answer" })).toContainText(DEMO_ANSWER_INTRO);
    await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
    expect(await soundsStarted(page)).toBe(0);
  });
});
