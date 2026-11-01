/**
 * The site's sounds (DESIGN.md section 12): which moments make one, the file
 * each is built from in sounds/, and its volume. `pnpm sounds`
 * (scripts/sounds/build.ts) builds the short sounds into one sprite and each
 * loop into a file of its own, and writes what it built to sprite.json, so
 * swapping a sound is a file swap and a rebuild, never a code change.
 */
import { z } from "zod";
import { LOOPS, type SoundLoop, type SoundMoment, SPRITE_MOMENTS } from "./names";
import sprite from "./sprite.json";

export type { SoundLoop, SoundMoment };

/**
 * How loud each plays, from 0 to 1. `pnpm sounds` brings every file to the
 * same peak, so these are the only place to trim one by ear. The loudest is
 * 0.5, as DESIGN.md says; the loops are very low.
 */
export const VOLUMES = {
  send: 0.4,
  suggestion: 0.3,
  answerEnd: 0.35,
  sources: 0.25,
  moo: 0.5,
  theme: 0.35,
  language: 0.3,
  panelOpen: 0.25,
  panelClose: 0.25,
  slider: 0.25,
  cv: 0.35,
  rain: 0.08,
  typing: 0.1,
} as const satisfies Record<SoundMoment | SoundLoop, number>;

/** WebM (Opus) first, MP3 for the browsers that can't play it. */
export const SPRITE_URLS = ["/sounds/sprite.webm", "/sounds/sprite.mp3"];
export const loopUrls = (loop: SoundLoop) => [`/sounds/${loop}.webm`, `/sounds/${loop}.mp3`];

const builtSchema = z.object({
  slices: z.partialRecord(z.enum(SPRITE_MOMENTS), z.tuple([z.number(), z.number()])),
  loops: z.array(z.enum(LOOPS)),
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

/** Whether each loop was built; one without a file in sounds/ stays silent. */
export const HAS_LOOP: Record<SoundLoop, boolean> = {
  rain: built.loops.includes("rain"),
  typing: built.loops.includes("typing"),
};
