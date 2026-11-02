import { z } from "zod";

export const SOUND_COOKIE = "sound";

/** Whether sounds are on: the `sound` cookie's `on` or `off`, and on without one. */
export function parseSoundCookie(value: unknown): boolean {
  return z.enum(["on", "off"]).catch("on").parse(value) === "on";
}
