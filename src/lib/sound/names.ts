/**
 * The site's sound moments and the source file in sounds/ each is built
 * from. No imports, so scripts/sounds/build.ts can load it under plain Node.
 */

/** The moments in the sprite. The rain loop is a file of its own: a looping slice clicks at its seams. */
export const SPRITE_MOMENTS = [
  "send",
  "answerStart",
  "answerEnd",
  "moo",
  "theme",
  "language",
  "slider",
  "cv",
] as const;
export type SoundMoment = (typeof SPRITE_MOMENTS)[number];

/** Each sound's source file in sounds/, without its extension. */
export const SOURCE_FILES = {
  send: "send",
  answerStart: "answer-start",
  answerEnd: "answer-end",
  moo: "moo",
  theme: "theme",
  language: "language",
  slider: "slider",
  cv: "cv",
  rain: "rain",
} as const satisfies Record<SoundMoment | "rain", string>;
