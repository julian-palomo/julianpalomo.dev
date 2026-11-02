import { describe, expect, it } from "vitest";
import { NEAR_HERD } from "../../src/lib/scene/herd";
import {
  calfStep,
  chaseOffset,
  cowNear,
  headLook,
  MIDGE_HOME,
  MIDGES,
  NESSIE,
  NESSIE_ASLEEP,
  type NessieWatch,
  nessieX,
  nextChase,
  overCottage,
  pineAt,
  scenePoint,
  shootingStarAllowed,
  visibleSpan,
  watchRipple,
  windowsLit,
} from "../../src/lib/scene/valley";

// A 390px phone's 230px hero and a 1280px laptop's 320px one, at the page's top.
const phone = { left: 0, top: 0, width: 390, height: 230 };
const laptop = { left: 0, top: 0, width: 1280, height: 320 };

describe("scenePoint", () => {
  it("puts the hero's bottom middle at the scene's x 600, y 320", () => {
    expect(scenePoint(phone, 195, 230)).toEqual({ x: 600, y: 320 });
    expect(scenePoint(laptop, 640, 320)).toEqual({ x: 600, y: 320 });
  });

  it("scales by the hero's height, so its top is the scene's top", () => {
    expect(scenePoint(phone, 195, 0).y).toBeCloseTo(0);
    // 230px tall shows 320 units: 100px to the right is 139 units.
    expect(scenePoint(phone, 295, 115).x).toBeCloseTo(600 + (100 * 320) / 230);
  });

  it("works on a short inner-page hero, wherever it sits on the page", () => {
    const inner = { left: 0, top: 400, width: 390, height: 140 };
    expect(scenePoint(inner, 195, 540)).toEqual({ x: 600, y: 320 });
    expect(scenePoint(inner, 195, 400).y).toBeCloseTo(0);
  });

  it("shows about x 330 to 870 on a phone, as DESIGN.md says", () => {
    const { from, to } = visibleSpan(phone);
    expect(from).toBeCloseTo(329, 0);
    expect(to).toBeCloseTo(871, 0);
  });
});

describe("the midges' chase", () => {
  const near = { x: MIDGE_HOME.x + 20, y: MIDGE_HOME.y };
  const far = { x: MIDGE_HOME.x + 400, y: MIDGE_HOME.y };

  it("starts when a pointer comes near the cloud, not far from it", () => {
    expect(nextChase({ status: "home" }, near, 0)).toEqual({ status: "chasing", since: 0 });
    expect(nextChase({ status: "home" }, far, 0)).toEqual({ status: "home" });
    expect(nextChase({ status: "home" }, null, 0)).toEqual({ status: "home" });
  });

  it("follows the pointer, but never further than its limit from home", () => {
    const chasing = { status: "chasing", since: 0 } as const;
    expect(chaseOffset(chasing, near)).toEqual({ x: 20, y: 0 });
    expect(chaseOffset(chasing, far)).toEqual({ x: MIDGES.farthest, y: 0 });
  });

  it("drifts back home after a few seconds, even with the pointer still there", () => {
    const chasing = { status: "chasing", since: 0 } as const;
    expect(nextChase(chasing, near, MIDGES.chaseMs - 1)).toBe(chasing);
    const back = nextChase(chasing, near, MIDGES.chaseMs);
    expect(back.status).toBe("resting");
    expect(chaseOffset(back, near)).toEqual({ x: 0, y: 0 });
  });

  it("drifts back home at once when the pointer leaves the hero", () => {
    const back = nextChase({ status: "chasing", since: 0 }, null, 500);
    expect(back).toEqual({ status: "resting", until: 500 + MIDGES.restMs });
  });

  it("won't chase again until it has rested", () => {
    const resting = { status: "resting", until: 5000 } as const;
    expect(nextChase(resting, near, 4999)).toBe(resting);
    const home = nextChase(resting, near, 5000);
    expect(home).toEqual({ status: "home" });
    expect(nextChase(home, near, 5001).status).toBe("chasing");
  });
});

describe("the herd", () => {
  const [grazer, calf, mother] = NEAR_HERD;
  if (!grazer || !calf || !mother) throw new Error("the near herd has three cows");

  it("notices a pointer by a cow's head, and none in the open", () => {
    expect(cowNear({ x: grazer.x + 18, y: grazer.y - 18 })).toBe(0);
    // The mother faces left, so her head is on her left.
    expect(cowNear({ x: mother.x - 16, y: mother.y - 15 })).toBe(2);
    expect(cowNear({ x: 900, y: 100 })).toBeNull();
  });

  it("lifts its head towards a pointer above, at most 20°", () => {
    const above = headLook(grazer, { x: grazer.x + 30, y: grazer.y - 40 });
    expect(above).toBeLessThan(0);
    expect(headLook(grazer, { x: grazer.x + 14, y: grazer.y - 300 })).toBe(-20);
  });

  it("looks the same way whichever side of it the pointer is on", () => {
    const point = (dx: number) => ({ x: grazer.x + 16 * grazer.scale + dx, y: grazer.y - 40 });
    expect(headLook(grazer, point(60))).toBeCloseTo(headLook(grazer, point(-60)));
  });

  it("steps the calf towards the pointer", () => {
    expect(calfStep(calf, { x: calf.x + 50, y: calf.y })).toBeGreaterThan(0);
    expect(calfStep(calf, { x: calf.x - 50, y: calf.y })).toBeLessThan(0);
  });
});

describe("the cottage and the pines", () => {
  it("finds the cottage and nothing beside it", () => {
    expect(overCottage({ x: 354, y: 214 })).toBe(true);
    expect(overCottage({ x: 420, y: 214 })).toBe(false);
  });

  it("finds a pine by its crown", () => {
    expect(pineAt({ x: 930, y: 225 })).toBe(0);
    expect(pineAt({ x: 170, y: 220 })).toBe(3);
    expect(pineAt({ x: 600, y: 225 })).toBeNull();
  });

  it("lights the windows once the sun is below the horizon", () => {
    expect(windowsLit(-1)).toBe(true);
    expect(windowsLit(5)).toBe(false);
  });
});

describe("shootingStarAllowed", () => {
  it("sends one on a clear night", () => {
    expect(shootingStarAllowed({ elevation: -20, clouds: 0, rain: 0 })).toBe(true);
    expect(shootingStarAllowed({ elevation: -6, clouds: 1, rain: 0 })).toBe(true);
  });

  it("sends none by day or at dusk", () => {
    expect(shootingStarAllowed({ elevation: 10, clouds: 0, rain: 0 })).toBe(false);
    expect(shootingStarAllowed({ elevation: -5.9, clouds: 0, rain: 0 })).toBe(false);
  });

  it("sends none through clouds or rain", () => {
    expect(shootingStarAllowed({ elevation: -20, clouds: 2, rain: 0 })).toBe(false);
    expect(shootingStarAllowed({ elevation: -20, clouds: 0, rain: 1 })).toBe(false);
  });
});

describe("Nessie", () => {
  function tapAt(times: number[], start: NessieWatch = NESSIE_ASLEEP, by: "tap" | "hover" = "tap") {
    let watch = start;
    const rises: number[] = [];
    for (const time of times) {
      const next = watchRipple(watch, time, by);
      watch = next.watch;
      if (next.rise) rises.push(time);
    }
    return { watch, rises };
  }

  it("rises on the fifth tap within ten seconds", () => {
    expect(tapAt([0, 1000, 2000, 3000]).rises).toEqual([]);
    expect(tapAt([0, 1000, 2000, 3000, 4000]).rises).toEqual([4000]);
    expect(tapAt([0, 2000, 4000, 6000, 9999]).rises).toEqual([9999]);
  });

  it("doesn't rise for five taps spread over more than ten seconds", () => {
    expect(tapAt([0, 3000, 6000, 9000, 12_000]).rises).toEqual([]);
  });

  it("never rises for ripples a mouse makes passing over the loch", () => {
    const sweep = Array.from({ length: 20 }, (_, index) => index * 600);
    expect(tapAt(sweep, NESSIE_ASLEEP, "hover").rises).toEqual([]);
    expect(tapAt(sweep, NESSIE_ASLEEP, "hover").watch).toEqual(NESSIE_ASLEEP);
  });

  it("rises only once a visit", () => {
    const taps = Array.from({ length: 15 }, (_, index) => index * 500);
    expect(tapAt(taps).rises).toEqual([2000]);
    const later = tapAt([60_000, 60_100, 60_200, 60_300, 60_400], tapAt(taps).watch);
    expect(later.rises).toEqual([]);
  });

  it("rises in her place on a phone, and moves in on a hero too narrow for it", () => {
    expect(nessieX(visibleSpan(phone))).toBe(NESSIE.x);
    expect(nessieX({ from: 500, to: 900 })).toBe(520);
  });
});
