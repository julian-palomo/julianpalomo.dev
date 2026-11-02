import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSoundCookie } from "../../src/lib/sound/cookie";
import {
  closedGate,
  type GateState,
  MIN_GAP_MS,
  MOO_GAP_MS,
  passGate,
} from "../../src/lib/sound/gate";
import { HAS_LOOP, SPRITE, VOLUMES } from "../../src/lib/sound/moments";
import { LOOPS, SOURCE_FILES, type SoundMoment, SPRITE_MOMENTS } from "../../src/lib/sound/names";

/** Plays each moment at Date.now(), as the provider does with the clock, and says which got through. */
function playAll(moments: { moment: SoundMoment; afterMs: number }[], start: GateState) {
  let state = start;
  return moments.map(({ moment, afterMs }) => {
    vi.advanceTimersByTime(afterMs);
    const result = passGate(state, moment, Date.now());
    state = result.state;
    return result.play;
  });
}

const open: GateState = { ...closedGate, interacted: true };

describe("passGate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-10-30T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("plays nothing before the visitor's first interaction", () => {
    expect(passGate(closedGate, "send", Date.now()).play).toBe(false);
  });

  it("lets a sound through once the visitor has interacted", () => {
    expect(passGate(open, "send", Date.now()).play).toBe(true);
  });

  it("plays no sound within 150ms of the last one", () => {
    expect(
      playAll(
        [
          { moment: "send", afterMs: 0 },
          { moment: "theme", afterMs: MIN_GAP_MS - 1 },
          { moment: "theme", afterMs: 1 },
        ],
        open,
      ),
    ).toEqual([true, false, true]);
  });

  it("moos at most once every 3s, while other sounds still play", () => {
    expect(
      playAll(
        [
          { moment: "moo", afterMs: 0 },
          { moment: "moo", afterMs: 1000 },
          { moment: "send", afterMs: 0 },
          { moment: "moo", afterMs: MOO_GAP_MS - 1000 - 1 },
          { moment: "moo", afterMs: 1 },
        ],
        open,
      ),
    ).toEqual([true, false, true, false, true]);
  });

  it("doesn't count a sound it held back", () => {
    const first = passGate(open, "send", 0).state;
    const held = passGate(first, "theme", 100);
    expect(held.state).toBe(first);
  });
});

describe("parseSoundCookie", () => {
  it("is on by default", () => {
    expect(parseSoundCookie(undefined)).toBe(true);
    expect(parseSoundCookie("loud")).toBe(true);
  });

  it("reads on and off", () => {
    expect(parseSoundCookie("on")).toBe(true);
    expect(parseSoundCookie("off")).toBe(false);
  });
});

describe("the sound map", () => {
  it("names a different source file for every moment and loop", () => {
    const files = [...SPRITE_MOMENTS, ...LOOPS].map((name) => SOURCE_FILES[name]);
    for (const file of files) expect(file).toBeTruthy();
    expect(new Set(files).size).toBe(files.length);
  });

  it("knows which loops were built", () => {
    const built = JSON.parse(readFileSync("src/lib/sound/sprite.json", "utf8"));
    for (const loop of LOOPS) expect(HAS_LOOP[loop]).toBe(built.loops.includes(loop));
  });

  it("plays nothing louder than half volume", () => {
    for (const volume of Object.values(VOLUMES)) {
      expect(volume).toBeGreaterThan(0);
      expect(volume).toBeLessThanOrEqual(0.5);
    }
  });

  it("has slices only for the sprite's moments, in order and without overlap", () => {
    const built = JSON.parse(readFileSync("src/lib/sound/sprite.json", "utf8"));
    const keys = Object.keys(built.slices);
    expect(keys.every((key) => (SPRITE_MOMENTS as readonly string[]).includes(key))).toBe(true);
    let end = 0;
    for (const key of keys) {
      const slice = SPRITE[key];
      if (!slice) throw new Error(`No slice for ${key}`);
      expect(slice[0]).toBeGreaterThanOrEqual(end);
      end = slice[0] + slice[1];
    }
  });
});
