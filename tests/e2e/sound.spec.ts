import { readFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { DEMO_ANSWER_INTRO } from "../../src/lib/bot/demo";

// Sounds (DESIGN.md section 12). Nothing here listens for real audio: an
// init script counts the sounds Howler starts through the Web Audio API.

const mute = (page: Page) => page.getByRole("button", { name: "Mute sounds" }).first();
const unmute = (page: Page) => page.getByRole("button", { name: "Turn sounds on" }).first();

type Counted = { soundsStarted: number; loopsPlaying: number; loopsStarted: number };

/** Counts the sounds started, and the loops started and still playing; Howler stops a loop's node to pause it. */
async function countSounds(page: Page) {
  await page.addInitScript(() => {
    const counted = window as unknown as Counted;
    counted.soundsStarted = 0;
    counted.loopsPlaying = 0;
    counted.loopsStarted = 0;
    const playing = new WeakSet<AudioBufferSourceNode>();
    const { start, stop } = AudioBufferSourceNode.prototype;
    AudioBufferSourceNode.prototype.start = function (...args) {
      // Howler unlocks the audio at the first interaction by starting a
      // one-sample buffer, which nobody hears; it isn't a sound.
      if ((this.buffer?.length ?? 0) <= 1) return start.apply(this, args);
      counted.soundsStarted += 1;
      if (this.loop) {
        counted.loopsStarted += 1;
        counted.loopsPlaying += 1;
        playing.add(this);
      }
      return start.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) {
      if (playing.delete(this)) counted.loopsPlaying -= 1;
      return stop.apply(this, args);
    };
  });
}

const counted = (page: Page) => page.evaluate(() => ({ ...(window as unknown as Counted) }));
const soundsStarted = async (page: Page) => (await counted(page)).soundsStarted;

// A sky without rain, so the only loop that can play is the typing.
const DRY = "/?sky=summer,12:00,rain=0";

async function ask(page: Page, question: string) {
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: "Send" }).click();
}

test("the toggle mutes sounds, says so, and remembers it across a reload", async ({
  page,
  context,
}) => {
  await page.goto(DRY);
  await press(mute(page), unmute(page));
  const cookie = (await context.cookies()).find(({ name }) => name === "sound");
  expect(cookie?.value).toBe("off");

  await page.reload();
  await press(unmute(page), mute(page));
});

/** Presses the toggle until it shows its other label: a press before hydration does nothing. */
async function press(from: Locator, to: Locator) {
  await expect(from).toBeVisible();
  await expect(async () => {
    if (await from.isVisible()) await from.click();
    await expect(to).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 5000 });
}

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
    const sprite = page.waitForResponse((response) => response.url().includes("/sounds/sprite."));
    await page.goto(DRY);
    await sprite;
    // A tap during the entrance ends it with a moo; these start after it.
    await expect(page.locator("[data-entrance]")).toHaveCount(0);
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

  test("an answer types itself out over a loop that stops at its last word", async ({ page }) => {
    const typing = page.waitForRequest((request) => request.url().includes("/sounds/typing."));
    await page.getByLabel("Your question").click();
    await ask(page, "What has Julian worked on?");
    await typing;
    await expect.poll(async () => (await counted(page)).loopsPlaying).toBe(1);
    await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
    await expect.poll(async () => (await counted(page)).loopsPlaying).toBe(0);
    expect((await counted(page)).loopsStarted).toBeGreaterThan(0);
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("an answer shows at once and the typing loop never loads", async ({ page }) => {
    await countSounds(page);
    const typing: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/sounds/typing.")) typing.push(request.url());
    });
    const sprite = page.waitForResponse((response) => response.url().includes("/sounds/sprite."));
    await page.goto(DRY);
    await sprite;
    await page.getByLabel("Your question").click();
    await ask(page, "What has Julian worked on?");
    await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
    await expect.poll(() => soundsStarted(page)).toBeGreaterThan(0);
    expect(typing).toEqual([]);
    expect((await counted(page)).loopsStarted).toBe(0);
  });
});

/** Presses Shift until the entrance ends: a key before hydration doesn't end it yet. */
async function endEntranceWithAKey(page: Page) {
  const playing = page.locator("[data-entrance]");
  await expect(playing).toHaveCount(1);
  await expect(async () => {
    await page.keyboard.press("Shift");
    await expect(playing).toHaveCount(0, { timeout: 300 });
  }).toPass({ timeout: 3000 });
}

test.describe("the entrance", () => {
  // The first visit's entrance: without the `visited` cookie the other specs get.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a key that ends the entrance makes the cow moo", async ({ page }) => {
    await countSounds(page);
    await page.goto(DRY);
    await endEntranceWithAKey(page);
    await expect.poll(() => soundsStarted(page)).toBe(1);
  });

  test("pressing Mute ends the entrance without a sound", async ({ page }) => {
    await countSounds(page);
    const sprite = page.waitForResponse((response) => response.url().includes("/sounds/sprite."));
    await page.goto(DRY);
    const playing = page.locator("[data-entrance]");
    // With the sprite loaded and decoded, a moo would play at once, before
    // the click that mutes; the first visit's entrance lasts long enough.
    await sprite;
    await page.waitForTimeout(500);
    await expect(playing).toHaveCount(1);
    await mute(page).click();
    await expect(playing).toHaveCount(0);
    await expect(unmute(page)).toBeVisible();
    expect(await soundsStarted(page)).toBe(0);
  });

  test("with sound off, ending the entrance stays silent", async ({ page, context }) => {
    await context.addCookies([{ name: "sound", value: "off", url: "http://localhost:4173" }]);
    await countSounds(page);
    const sprite = page.waitForResponse((response) => response.url().includes("/sounds/sprite."));
    await page.goto(DRY);
    await endEntranceWithAKey(page);
    // Long enough for the sprite to load and decode, and a moo to play if one were asked for.
    await sprite;
    await page.waitForTimeout(500);
    expect(await soundsStarted(page)).toBe(0);
  });
});
