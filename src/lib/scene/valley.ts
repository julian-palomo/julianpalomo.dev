/*
 * The valley noticing the pointer (DESIGN.md section 7, "The valley notices
 * the pointer"): where a pointer on the hero is in the scene, what it's over,
 * and the rules for the midges' chase, the shooting star and Nessie. Pure:
 * src/components/landscape/use-valley.ts listens and draws.
 *
 * The loch's water and the sky are found against the drawing itself, with
 * the browser's isPointInFill, so they're not here.
 */

import { type HerdPlacement, NEAR_HERD, NECK } from "./herd";
import { MIDGE_CLOUD } from "./particles";

export type Point = { x: number; y: number };
type Box = { left: number; top: number; width: number; height: number };

// The landscape's viewBox is −600 0 2400 320, shown with `xMidYMax slice`.
const VIEW = { left: -600, width: 2400, height: 320 } as const;
const CENTRE_X = VIEW.left + VIEW.width / 2;

/** Screen px per scene unit in a hero `box`: `slice` scales by whichever side is bound. */
export function unitPx(box: Pick<Box, "width" | "height">): number {
  return Math.max(box.width / VIEW.width, box.height / VIEW.height);
}

/**
 * The scene's point under a pointer at `clientX`, `clientY`, in a hero
 * `box`: its middle is the scene's x 600 and its bottom the scene's y 320,
 * whatever the hero's height, the home page's or an inner page's.
 */
export function scenePoint(box: Box, clientX: number, clientY: number): Point {
  const px = unitPx(box);
  return {
    x: CENTRE_X + (clientX - (box.left + box.width / 2)) / px,
    y: VIEW.height - (box.top + box.height - clientY) / px,
  };
}

/** The scene's x span a hero `box` shows. */
export function visibleSpan(box: Pick<Box, "width" | "height">): { from: number; to: number } {
  const half = box.width / 2 / unitPx(box);
  return { from: CENTRE_X - half, to: CENTRE_X + half };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// ── The midges ─────────────────────────────────────────────────────────────

/** The middle of the midges' cloud over the loch. */
export const MIDGE_HOME: Point = {
  x: (MIDGE_CLOUD.x[0] + MIDGE_CLOUD.x[1]) / 2,
  y: (MIDGE_CLOUD.y[0] + MIDGE_CLOUD.y[1]) / 2,
};

export const MIDGES = {
  /** A pointer this close to the cloud's middle, in scene units, draws it. */
  reach: 60,
  /** It follows at most this far from home. */
  farthest: 150,
  /** It follows for this long, then drifts home. */
  chaseMs: 3000,
  /** Once home again it won't chase for this long. */
  restMs: 2000,
} as const;

export type Chase =
  | { status: "home" }
  | { status: "chasing"; since: number }
  | { status: "resting"; until: number };

/** The midges' chase a moment later, with the pointer where it is now, or `null` off the hero. */
export function nextChase(chase: Chase, pointer: Point | null, now: number): Chase {
  switch (chase.status) {
    case "home":
      return pointer && distance(pointer, MIDGE_HOME) <= MIDGES.reach
        ? { status: "chasing", since: now }
        : chase;
    case "chasing":
      return !pointer || now - chase.since >= MIDGES.chaseMs
        ? { status: "resting", until: now + MIDGES.restMs }
        : chase;
    case "resting":
      return now >= chase.until ? { status: "home" } : chase;
    default: {
      const unhandled: never = chase;
      throw new Error(String(unhandled));
    }
  }
}

/** Where the cloud heads, from its home, in scene units: after the pointer while chasing, home otherwise. */
export function chaseOffset(chase: Chase, pointer: Point | null): Point {
  if (chase.status !== "chasing" || !pointer) return { x: 0, y: 0 };
  const dx = pointer.x - MIDGE_HOME.x;
  const dy = pointer.y - MIDGE_HOME.y;
  const far = Math.hypot(dx, dy);
  const shrink = far > MIDGES.farthest ? MIDGES.farthest / far : 1;
  return { x: dx * shrink, y: dy * shrink };
}

// ── The herd ───────────────────────────────────────────────────────────────

/** A pointer this close to a near cow's head, in scene units, gets its attention. */
const COW_REACH = 40;
/** How far a cow lifts its head towards the pointer, and lowers it, in degrees. */
const HEAD_UP = 20;
const HEAD_DOWN = 10;
/** The calf's step towards the pointer, in its own units. */
const CALF_STEP = 3;

/** A point in a cow's own drawing: facing right, feet on y 0. */
function local(cow: HerdPlacement, point: Point): Point {
  const flip = cow.facesLeft ? -1 : 1;
  return { x: ((point.x - cow.x) / cow.scale) * flip, y: (point.y - cow.y) / cow.scale };
}

/** The near cow whose head the pointer is close to, by its index in NEAR_HERD, or null. */
export function cowNear(point: Point): number | null {
  let nearest: number | null = null;
  let best = COW_REACH;
  NEAR_HERD.forEach((cow, index) => {
    const flip = cow.facesLeft ? -1 : 1;
    // The middle of its head, a little ahead of and above the neck.
    const head = {
      x: cow.x + (NECK.x + 6) * cow.scale * flip,
      y: cow.y + (NECK.y - 3) * cow.scale,
    };
    const away = distance(point, head);
    if (away <= best) {
      best = away;
      nearest = index;
    }
  });
  return nearest;
}

/**
 * The angle a cow's head turns to, to look at the pointer, in its drawing's
 * degrees (negative lifts it): up towards a pointer above, a little down
 * towards one below, the same whichever side the pointer is on.
 */
export function headLook(cow: HerdPlacement, point: Point): number {
  const { x, y } = local(cow, point);
  const angle = (Math.atan2(y - NECK.y, Math.abs(x - NECK.x)) * 180) / Math.PI;
  return Math.max(-HEAD_UP, Math.min(HEAD_DOWN, angle));
}

/** The calf's small step towards the pointer, in its own units: forwards or back. */
export function calfStep(cow: HerdPlacement, point: Point): number {
  return local(cow, point).x >= 0 ? CALF_STEP : -CALF_STEP;
}

// ── The cottage and the pines ──────────────────────────────────────────────

type Rect = { x: number; y: number; width: number; height: number };
const inside = (point: Point, { x, y, width, height }: Rect) =>
  point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;

/** The cottage, from its chimney to its door, where Cottage.tsx draws it. */
const COTTAGE: Rect = { x: 332, y: 190, width: 44, height: 32 };

export function overCottage(point: Point): boolean {
  return inside(point, COTTAGE);
}

/** The windows are lit from the moment the sun is below the horizon (`golden` and darker). */
export function windowsLit(elevation: number): boolean {
  return elevation < 0;
}

/** Each pine's crown, in Pines.tsx's order (t1 to t5). */
const PINE_CROWNS: readonly Rect[] = [
  { x: 906, y: 206, width: 44, height: 36 },
  { x: 939, y: 214, width: 35, height: 28 },
  { x: 957, y: 191, width: 51, height: 40 },
  { x: 149, y: 205, width: 38, height: 30 },
  { x: 188, y: 216, width: 31, height: 25 },
];

/** The pine whose crown the pointer is in, by its index, or null. */
export function pineAt(point: Point): number | null {
  const index = PINE_CROWNS.findIndex((crown) => inside(point, crown));
  return index === -1 ? null : index;
}

// ── The shooting star ──────────────────────────────────────────────────────

/**
 * A click on the sky sends a shooting star only at night, with the sun at or
 * below 6° under the horizon (the theme's night), and only in a clear sky:
 * at most one cloud level and no rain (the aurora's "clear").
 */
export function shootingStarAllowed(sky: {
  elevation: number;
  clouds: number;
  rain: number;
}): boolean {
  return sky.elevation <= -6 && sky.clouds <= 1 && sky.rain === 0;
}

// ── Nessie ─────────────────────────────────────────────────────────────────

export const NESSIE = {
  /** This many taps on the loch… */
  taps: 5,
  /** …within this long bring her up, once per visit. */
  withinMs: 10_000,
  /** Where she rises, near the loch's left end, which every screen shows. */
  x: 470,
  /** The waterline she rises from and sinks back into. */
  y: 252,
  /** How far she glides, to the right. Keep in step with landscape-nessie in landscape.css. */
  glide: 40,
  /** Her whole visit: rise, glide and sink. Keep in step with landscape.css. */
  ms: 4000,
} as const;

export type NessieWatch = { taps: readonly number[]; risen: boolean };

export const NESSIE_ASLEEP: NessieWatch = { taps: [], risen: false };

/**
 * One more tap (or click) on the loch's water at `now`. Five within ten
 * seconds bring her up, once a visit; after that a tap does nothing. Only
 * taps count: the loch never answers a mouse passing over it.
 */
export function watchTap(watch: NessieWatch, now: number): { watch: NessieWatch; rise: boolean } {
  if (watch.risen) return { watch, rise: false };
  const taps = [...watch.taps.filter((at) => now - at < NESSIE.withinMs), now];
  if (taps.length >= NESSIE.taps) return { watch: { taps: [], risen: true }, rise: true };
  return { watch: { taps, risen: false }, rise: false };
}

/** Where she rises: her usual place, moved in if the hero is too narrow to show it. */
export function nessieX(span: { from: number; to: number }): number {
  // Her drawing reaches 8 units behind her and 26 ahead, plus the glide.
  const fromLeft = span.from + 20;
  const fromRight = span.to - 30 - NESSIE.glide;
  return Math.max(fromLeft, Math.min(fromRight, NESSIE.x));
}
