import { existsSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { CYCLE_STEPS } from "../../src/lib/how/cycle";
import { docUrl } from "../../src/lib/how/docs";
import { RING_DOCS, RING_ITEMS } from "../../src/lib/how/ring";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";

// The How it's built page (DESIGN.md section 18).

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
});

const section = (page: Page, messages: typeof en, heading: "howAnswered" | "howIBuiltIt") =>
  page.getByRole("region", { name: messages.howItsBuilt[heading] });
const ring = (page: Page, messages: typeof en = en) => section(page, messages, "howAnswered");
const cycle = (page: Page, messages: typeof en = en) => section(page, messages, "howIBuiltIt");
const stop = (page: Page, name: string) => ring(page).getByRole("button", { name, exact: true });
// Only the current card is visible; the others are hidden from everyone.
const card = (page: Page, name: string) =>
  ring(page).getByRole("heading", { level: 3, name, exact: true });

for (const [path, messages] of [
  ["/how-its-built", en],
  ["/es/how-its-built", es],
] as const) {
  test(`${path} renders both diagrams with their first card, in its language`, async ({ page }) => {
    const copy = messages.howItsBuilt;
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages.howItsBuiltTitle);
    await expect(page.getByRole("heading", { level: 2, name: copy.whatItDoes })).toBeVisible();
    for (const part of [copy.cow, copy.sources, copy.exam, copy.limits, copy.valley]) {
      await expect(page.getByRole("heading", { level: 3, name: part.title })).toBeVisible();
    }
    await expect(
      ring(page, messages).getByRole("heading", { level: 3, name: copy.ring.question.name }),
    ).toBeVisible();
    await expect(ring(page, messages).getByText(copy.ring.question.plain)).toBeVisible();
    const first = `${copy.cycle.actors.me.name} → ${copy.cycle.actors.claudeCode.name}`;
    await expect(cycle(page, messages).getByRole("heading", { level: 3 })).toHaveText(first);
    await expect(cycle(page, messages).getByText(copy.cycle.steps[0]?.plain ?? "")).toBeVisible();
    await expect(page.locator("details")).toHaveCount(0);
  });
}

test.describe("the ring", () => {
  test("plays by itself, and tapping Claude shows its card and pauses it", async ({ page }) => {
    const copy = en.howItsBuilt.ring;
    await page.goto("/how-its-built");
    await expect(ring(page).getByRole("button", { name: copy.pause })).toBeVisible();
    await expect(stop(page, copy.limits.name)).toHaveAttribute("aria-pressed", "true", {
      timeout: 4000,
    });
    await stop(page, copy.claude.name).click();
    await expect(stop(page, copy.claude.name)).toHaveAttribute("aria-pressed", "true");
    await expect(card(page, copy.claude.name)).toBeVisible();
    await expect(ring(page).getByText(copy.claude.plain)).toBeVisible();
    await expect(ring(page).getByRole("button", { name: copy.play })).toBeVisible();
    // Paused: it stays on Claude once the pointer has left.
    await page.mouse.move(0, 0);
    await page.waitForTimeout(3200);
    await expect(stop(page, copy.claude.name)).toHaveAttribute("aria-pressed", "true");
  });

  test("every stop points at the one card", async ({ page }) => {
    await page.goto("/how-its-built");
    const buttons = ring(page).locator("button[aria-pressed]");
    await expect(buttons).toHaveCount(RING_ITEMS.length);
    const controls = await buttons.evaluateAll((all) =>
      all.map((button) => button.getAttribute("aria-controls")),
    );
    expect(new Set(controls).size).toBe(1);
    const id = controls[0] ?? "";
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  });

  test("the technical side shows the line and its link, in a new tab", async ({ page }) => {
    const copy = en.howItsBuilt;
    await page.goto("/how-its-built");
    await stop(page, copy.ring.claude.name).click();
    const disclosure = ring(page).getByRole("button", { name: copy.ring.technical });
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await expect(ring(page).getByText(copy.ring.claude.technical)).toBeHidden();
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(ring(page).getByText(copy.ring.claude.technical)).toBeVisible();
    const link = ring(page).getByRole("link", {
      // The arrow is hidden from screen readers; the note says where it goes.
      name: `${copy.docNames["docs/architecture.md"]}${copy.newTab}`,
    });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", docUrl("docs/architecture.md"));
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener");
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("the selected stop doesn't change by itself", async ({ page }) => {
      const copy = en.howItsBuilt.ring;
      await page.goto("/how-its-built");
      await expect(ring(page).getByRole("button", { name: copy.play })).toBeVisible();
      await page.waitForTimeout(3000);
      await expect(stop(page, copy.question.name)).toHaveAttribute("aria-pressed", "true");
      await expect(card(page, copy.question.name)).toBeVisible();
    });
  });

  for (const [path, messages] of [
    ["/how-its-built", en],
    ["/es/how-its-built", es],
  ] as const) {
    for (const width of [320, 375, 1024]) {
      test(`${path}: no two parts overlap at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        // The stops, the centre, the shortcut and Pause; the cards' disclosures have aria-expanded.
        await expectApart(ring(page, messages).locator("button:not([aria-expanded])"));
        await expectApart(cycle(page, messages).locator("[data-actor]"));
      });
    }
  }
});

test.describe("the cycle", () => {
  const copy = en.howItsBuilt.cycle;
  const next = (page: Page) => cycle(page).getByRole("button", { name: copy.next });

  test("Next moves to step 2 of 10, and Previous comes back", async ({ page }) => {
    await page.goto("/how-its-built");
    await expect(cycle(page).getByText(copy.position(1, 10))).toBeVisible();
    await next(page).click();
    await expect(cycle(page).getByText(copy.position(2, 10))).toBeVisible();
    await expect(cycle(page).getByRole("heading", { level: 3 })).toHaveText(
      `${copy.actors.claudeCode.name} → ${copy.actors.github.name}`,
    );
    await cycle(page).getByRole("button", { name: copy.previous }).click();
    await expect(cycle(page).getByText(copy.position(1, 10))).toBeVisible();
  });

  test("Previous does nothing on the first step", async ({ page }) => {
    await page.goto("/how-its-built");
    const previous = cycle(page).getByRole("button", { name: copy.previous });
    await expect(previous).toHaveAttribute("aria-disabled", "true");
    // Playwright won't click an aria-disabled button, so press it from the keyboard.
    await previous.focus();
    await page.keyboard.press("Enter");
    await expect(previous).toBeFocused();
    await expect(cycle(page).getByText(copy.position(1, 10))).toBeVisible();
  });

  test("For developers shows the technical line and its link", async ({ page }) => {
    const names = en.howItsBuilt.docNames;
    await page.goto("/how-its-built");
    const developers = cycle(page).getByRole("button", { name: copy.developers });
    await developers.click();
    await expect(developers).toHaveAttribute("aria-pressed", "true");
    await expect(cycle(page).getByText(copy.steps[0]?.technical ?? "")).toBeVisible();
    await expect(cycle(page).getByText(copy.steps[0]?.plain ?? "")).toHaveCount(0);
    const link = cycle(page).getByRole("link");
    await expect(link).toHaveAttribute("href", docUrl(".claude/skills/implement-issue/SKILL.md"));
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toContainText(names[".claude/skills/implement-issue/SKILL.md"]);
    // The side stays as the visitor steps on.
    await next(page).click();
    await expect(cycle(page).getByText(copy.steps[1]?.technical ?? "")).toBeVisible();
  });

  test('Next on step 10 says "Start again", and starts again', async ({ page }) => {
    await page.goto("/how-its-built");
    for (let step = 1; step < 10; step += 1) await next(page).click();
    await expect(cycle(page).getByText(copy.position(10, 10))).toBeVisible();
    const again = cycle(page).getByRole("button", { name: copy.again });
    await expect(again).toBeVisible();
    await again.click();
    await expect(cycle(page).getByText(copy.position(1, 10))).toBeVisible();
  });
});

test("every document link points at a file in the repo, and none of the old ones is lost", () => {
  const docs = [...RING_ITEMS.map((item) => RING_DOCS[item]), ...CYCLE_STEPS.map((s) => s.doc)];
  for (const doc of docs) {
    expect(docUrl(doc)).toBe(`https://github.com/julian-palomo/julianpalomo.dev/blob/main/${doc}`);
    // Checked against the repo itself, not over the network.
    const file = doc.split("#")[0] ?? "";
    expect(existsSync(file), file).toBe(true);
  }
  // Files the page must keep linking to, so the technical side never loses one; a link to an anchor in the same file covers it.
  const files = new Set(docs.map((doc) => doc.split("#")[0]));
  for (const old of [
    "docs/architecture.md",
    "docs/evals.md",
    ".claude/rules/claims.md",
    "AGENTS.md",
    ".claude/README.md",
    "docs/adr/README.md",
  ]) {
    expect(files.has(old), old).toBe(true);
  }
  expect(docs).toContain("AGENTS.md#2-workflow");
});

test("every link to GitHub on the page opens in a new tab", async ({ page }) => {
  await page.goto("/how-its-built");
  await ring(page).getByRole("button", { name: en.howItsBuilt.ring.technical }).first().click();
  await cycle(page).getByRole("button", { name: en.howItsBuilt.cycle.developers }).click();
  const links = page.getByRole("main").locator('a[href^="https://github.com/"]');
  expect(await links.count()).toBeGreaterThan(0);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener");
  }
});

test("the stops, the switch and the step buttons show the focus ring from the keyboard", async ({
  page,
}) => {
  const copy = en.howItsBuilt;
  await page.goto("/how-its-built");
  const targets = [
    ...RING_ITEMS.map((item) => stop(page, copy.ring[item].name)),
    ring(page).getByRole("button", { name: copy.ring.pause }),
    cycle(page).getByRole("button", { name: copy.cycle.previous }),
    cycle(page).getByRole("button", { name: copy.cycle.next }),
    cycle(page).getByRole("button", { name: copy.cycle.plain }),
    cycle(page).getByRole("button", { name: copy.cycle.developers }),
  ];
  for (const target of targets) {
    await target.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(target).toBeFocused();
    expect(await target.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
      "solid",
    );
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

test("the home page's card, the footers and the Projects card link to the page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: en.pagesLabel })
      .getByRole("link", { name: en.howItsBuiltTitle }),
  ).toHaveAttribute("href", "/how-its-built");
  await page.goto("/projects");
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: en.howItsBuiltTitle }),
  ).toHaveAttribute("href", "/how-its-built");
  await expect(
    page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: "julianpalomo.dev" }) })
      .getByRole("link", { name: en.howItsBuiltTitle }),
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
      await ring(page).getByRole("button", { name: en.howItsBuilt.ring.technical }).first().click();
      await cycle(page).getByRole("button", { name: en.howItsBuilt.cycle.developers }).click();
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll).toBeLessThanOrEqual(width);
    });
  }
}

/** No two of the elements' boxes overlap. */
async function expectApart(elements: Locator) {
  const boxes = await elements.evaluateAll((all) =>
    all.map((element) => {
      const { left, top, right, bottom } = element.getBoundingClientRect();
      return { name: element.textContent ?? "", left, top, right, bottom };
    }),
  );
  expect(boxes.length).toBeGreaterThan(1);
  for (const [index, a] of boxes.entries()) {
    for (const b of boxes.slice(index + 1)) {
      const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      expect(overlap, `${a.name} and ${b.name}`).toBe(false);
    }
  }
}
