import { expect, type Page, test } from "@playwright/test";

// The buttons' gestures and the valley noticing the pointer (DESIGN.md
// sections 7 and 11). `?sky=` fixes the scene, so no test waits for the
// weather and the night is a night.

// Exact: the chip's own name ends with "Play with the sky" too.
const gear = (page: Page) => page.getByRole("button", { name: "Play with the sky", exact: true });
// The gear spins in 2s after the short entrance, about 2s, and spins for 0.6s.
const GEAR_WAIT = 8000;

/** The transform of `selector`, every frame for `ms`, starting now. */
function sampleTransforms(page: Page, selector: string, ms: number): Promise<string[]> {
  return page.evaluate(
    ([selector, ms]) =>
      new Promise<string[]>((resolve) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`No ${selector}`);
        const seen: string[] = [];
        const start = performance.now();
        const frame = () => {
          seen.push(getComputedStyle(element).transform);
          if (performance.now() - start < ms) requestAnimationFrame(frame);
          else resolve(seen);
        };
        frame();
      }),
    [selector, ms] as const,
  );
}

/** The screen point of a point in the landscape's viewBox (−600 0 2400 320, xMidYMax slice). */
async function onScreen(page: Page, x: number, y: number) {
  const box = await page.locator("svg.landscape").boundingBox();
  if (!box) throw new Error("No landscape");
  const px = Math.max(box.width / 2400, box.height / 320);
  return {
    x: box.x + box.width / 2 + (x - 600) * px,
    y: box.y + box.height - (320 - y) * px,
  };
}

async function tapLoch(page: Page, times: number) {
  // Open water, left of the islet and clear of the herd.
  const water = await onScreen(page, 520, 250);
  for (let tap = 0; tap < times; tap++) {
    await page.mouse.click(water.x, water.y);
    await page.waitForTimeout(150);
  }
}

test("with a mouse, hovering the gear turns it and it springs back to rest", async ({ page }) => {
  await page.goto("/?sky=autumn,15:00");
  await expect(gear(page)).toBeVisible({ timeout: GEAR_WAIT });
  // Waits out the gear's spin and pulses, so the real hover lands at once.
  await gear(page).hover({ trial: true });
  const sampling = sampleTransforms(page, '[data-boop="gear"]', 1000);
  await gear(page).hover();
  const seen = await sampling;
  expect(seen.some((transform) => transform !== "none")).toBe(true);
  expect(seen.at(-1)).toBe("none");
});

test("tapping the loch ripples it, and five taps bring Nessie up once a visit", async ({
  page,
}) => {
  await page.goto("/?sky=autumn,15:00");
  const scene = page.locator("svg.landscape");
  await tapLoch(page, 1);
  await expect(scene.locator(".ripple-at").first()).toBeAttached();
  await expect(scene.locator(".nessie")).toHaveCount(0);

  await tapLoch(page, 4);
  await expect(scene.locator(".nessie")).toHaveCount(1);
  // She rises, glides and sinks in about 4s, then leaves the drawing.
  await expect(scene.locator(".nessie")).toHaveCount(0, { timeout: 6000 });

  await tapLoch(page, 5);
  await page.waitForTimeout(300);
  await expect(scene.locator(".nessie")).toHaveCount(0);
});

// y 80: low enough to be under the hero's row of controls, high enough to be sky.
test("a click on a clear night's sky sends a shooting star, and none by day", async ({ page }) => {
  await page.goto("/?sky=winter,22:00");
  const sky = await onScreen(page, 600, 80);
  await page.mouse.click(sky.x, sky.y);
  await expect(page.locator("svg.landscape .shooting-star")).toHaveCount(1);

  await page.goto("/?sky=winter,13:00");
  const day = await onScreen(page, 600, 80);
  await page.mouse.click(day.x, day.y);
  await page.waitForTimeout(300);
  await expect(page.locator("svg.landscape .shooting-star")).toHaveCount(0);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("hovering a button changes nothing", async ({ page }) => {
    await page.goto("/?sky=autumn,15:00");
    await expect(gear(page)).toBeVisible({ timeout: GEAR_WAIT });
    await gear(page).hover({ trial: true });
    const sampling = sampleTransforms(page, '[data-boop="gear"]', 1000);
    await gear(page).hover();
    expect(new Set(await sampling)).toEqual(new Set(["none"]));
  });

  test("taps on the loch bring no ripples and no Nessie", async ({ page }) => {
    await page.goto("/?sky=autumn,15:00");
    await tapLoch(page, 5);
    const scene = page.locator("svg.landscape");
    await expect(scene.locator(".ripple-at")).toHaveCount(0);
    await expect(scene.locator(".nessie")).toHaveCount(0);
  });
});
