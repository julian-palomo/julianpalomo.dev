/*
 * Where the herd stands (DESIGN.md section 7, "The herd"): the drawing in
 * src/components/landscape/Herd.tsx places its cows here, and the valley's
 * reactions to the pointer (valley.ts) find them here.
 */

export type HerdPlacement = {
  /** What its head does: grazes (16s, or 19s offset) or looks around (11s). */
  loop: "graze" | "graze2" | "look";
  calf?: boolean;
  x: number;
  y: number;
  scale: number;
  facesLeft?: boolean;
};

/** The cow on the right hill, behind the first haar band: only wide screens reach it. */
export const FAR_COW: HerdPlacement = { loop: "graze2", x: 1118, y: 222, scale: 0.26 };

/** The grazer, the calf and its mother, in the middle band every screen shows. */
export const NEAR_HERD: readonly HerdPlacement[] = [
  { loop: "graze", x: 420, y: 294, scale: 0.8 },
  { loop: "look", calf: true, x: 598, y: 296, scale: 0.48 },
  { loop: "graze2", x: 655, y: 294, scale: 0.72, facesLeft: true },
];

/**
 * The point a cow's head turns around, in its own drawing's units (facing
 * right, feet on y 0). Keep in step with `.hc-head` in src/styles/landscape.css.
 */
export const NECK = { x: 16, y: -17 } as const;
