/**
 * The Projects page's screenshots (DESIGN.md section 18): their files in
 * public/images/projects/, each as AVIF, WebP and a PNG fallback, with their
 * size so nothing shifts as they load. Phone shots are 400px wide, twice their
 * width in a card; desktop shots keep 1280px. Their alt text is in the
 * translations (`projectShots`).
 *
 * `grow` is each shot's width over its height, as a Tailwind class: in a row,
 * shots that grow by their own ratio share one height. Keep it in step with
 * the size, written out in full so Tailwind finds it.
 */
const PHONE = { width: 400, height: 866, grow: "grow-[0.4619]" } as const;
const DESKTOP = { width: 1280, height: 800, grow: "grow-[1.6]" } as const;

export const SHOTS = {
  "format-player": PHONE,
  "format-sets": PHONE,
  "format-events": PHONE,
  "format-home": DESKTOP,
  "site-home": DESKTOP,
  "site-home-phone": PHONE,
} as const;

export type ShotName = keyof typeof SHOTS;

/** Each project's shots, row by row; a row's shots share one height. */
export const PROJECT_SHOTS: Record<string, readonly (readonly ShotName[])[]> = {
  format: [["format-player", "format-sets", "format-events"], ["format-home"]],
  site: [["site-home", "site-home-phone"]],
};
