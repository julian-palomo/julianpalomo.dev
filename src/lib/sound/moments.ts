/**
 * The site's sounds (DESIGN.md section 12): which moments make one, the file
 * each is built from in sounds/, and its volume. `pnpm sounds`
 * (scripts/sounds/build.ts) builds every moment but the rain into one sprite,
 * and writes where each slice sits to sprite.json, so swapping a sound is a
 * file swap and a rebuild, never a code change.
 */
import { z } from "zod";
import { type SoundMoment, SPRITE_MOMENTS } from "./names";
import sprite from "./sprite.json";

export type { SoundMoment };

/**
 * How loud each plays, from 0 to 1. `pnpm sounds` brings every file to the
 * same peak, so these are the only place to trim one by ear. The loudest is
 * 0.5, as DESIGN.md says; the rain is very low.
 */
export const VOLUMES = {
  send: 0.4,
  answerStart: 0.2,
  answerEnd: 0.35,
  moo: 0.5,
  theme: 0.35,
  language: 0.3,
  slider: 0.25,
  cv: 0.35,
  rain: 0.08,
} as const satisfies Record<SoundMoment | "rain", number>;

/** WebM (Opus) first, MP3 for the browsers that can't play it. */
export const SPRITE_URLS = ["/sounds/sprite.webm", "/sounds/sprite.mp3"];
export const RAIN_URLS = ["/sounds/rain.webm", "/sounds/rain.mp3"];

const builtSchema = z.object({
  slices: z.partialRecord(z.enum(SPRITE_MOMENTS), z.tuple([z.number(), z.number()])),
  rain: z.boolean(),
});

const built = builtSchema.parse(sprite);

/**
 * Where each moment's slice sits in the sprite, [start, duration] in ms, for
 * use-sound's `sprite`. A moment without a file in sounds/ has none and stays
 * silent; with none at all, there's no sprite to load.
 */
export const SPRITE: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(built.slices).filter((entry): entry is [string, [number, number]] =>
    Array.isArray(entry[1]),
  ),
);

/** Whether the rain loop was built. */
export const HAS_RAIN = built.rain;
