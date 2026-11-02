/**
 * The Projects page's screenshots (DESIGN.md section 18): their files in
 * public/images/projects/, each as AVIF, WebP and a PNG fallback, with their
 * size so nothing shifts as they load. Phone shots are 400px wide, twice their
 * width in a card; desktop shots keep 1280px. Their alt text is in the
 * translations (`projectShots`).
 */
export const SHOTS = {
  "format-player": { width: 400, height: 866 },
  "format-sets": { width: 400, height: 866 },
  "format-events": { width: 400, height: 866 },
  "format-home": { width: 1280, height: 800 },
  "site-home": { width: 1280, height: 800 },
  "site-home-phone": { width: 400, height: 866 },
} as const;

export type ShotName = keyof typeof SHOTS;

/** Each project's shots, row by row; a row's shots share one height. */
export const PROJECT_SHOTS: Record<string, readonly (readonly ShotName[])[]> = {
  format: [["format-player", "format-sets", "format-events"], ["format-home"]],
  site: [["site-home", "site-home-phone"]],
};
