/**
 * The site's sound moments and the source file in sounds/ each is built
 * from. No imports, so scripts/sounds/build.ts can load it under plain Node.
 */

/** The moments in the sprite: short sounds, each answering something the visitor did. */
export const SPRITE_MOMENTS = [
  "send",
  "suggestion",
  "answerEnd",
  "sources",
  "moo",
  "theme",
  "language",
  "panelOpen",
  "panelClose",
  "slider",
  "cv",
] as const;
export type SoundMoment = (typeof SPRITE_MOMENTS)[number];

/**
 * The loops, each a file of its own, loaded only the first time it's needed:
 * a looping slice of a sprite clicks at its seams.
 */
export const LOOPS = ["rain", "typing"] as const;
export type SoundLoop = (typeof LOOPS)[number];

/** Each sound's source file in sounds/, without its extension. */
export const SOURCE_FILES = {
  send: "send",
  suggestion: "suggestion",
  answerEnd: "answer-end",
  sources: "sources",
  moo: "moo",
  theme: "theme",
  language: "language",
  panelOpen: "panel-open",
  panelClose: "panel-close",
  slider: "slider",
  cv: "cv",
  rain: "rain",
  typing: "typing",
} as const satisfies Record<SoundMoment | SoundLoop, string>;
