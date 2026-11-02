import { describe, expect, it } from "vitest";
import { atRest, kick, settle, springs, stepSpring } from "../../src/lib/spring";

describe("stepSpring", () => {
  it("comes to rest on its target", () => {
    let state = { value: 0, velocity: 0 };
    for (let frame = 0; frame < 120; frame++) state = stepSpring(state, 10, springs.follow, 1 / 60);
    expect(atRest(state, 10)).toBe(true);
  });

  it("overshoots less with more damping", () => {
    const furthest = (damping: number) => {
      const spring = { stiffness: 300, damping, mass: 1 };
      let state = { value: 0, velocity: 0 };
      let max = 0;
      for (let frame = 0; frame < 120; frame++) {
        state = stepSpring(state, 1, spring, 1 / 60);
        max = Math.max(max, state.value);
      }
      return max;
    };
    expect(furthest(8)).toBeGreaterThan(furthest(20));
    expect(furthest(40)).toBeLessThanOrEqual(1.001);
  });

  it("gives the same result however the time is cut", () => {
    const once = stepSpring({ value: 0, velocity: 0 }, 1, springs.boop, 0.1);
    let often = { value: 0, velocity: 0 };
    for (let step = 0; step < 24; step++) often = stepSpring(often, 1, springs.boop, 0.1 / 24);
    expect(often.value).toBeCloseTo(once.value, 6);
  });
});

describe("kick", () => {
  it("starts and ends at rest, and reaches exactly 1 at its furthest", () => {
    for (const spring of Object.values(springs)) {
      const { values } = kick(spring);
      expect(values[0]).toBe(0);
      expect(values.at(-1)).toBe(0);
      expect(Math.max(...values.map(Math.abs))).toBeCloseTo(1, 6);
    }
  });

  it("springs back past rest a little for a boop, and not for a hop", () => {
    expect(Math.min(...kick(springs.boop).values)).toBeLessThan(-0.1);
    expect(Math.min(...kick(springs.hop).values)).toBeGreaterThan(-0.01);
  });

  it("goes back and forth for a shake", () => {
    expect(Math.min(...kick(springs.shake).values)).toBeLessThan(-0.4);
  });

  it("settles the gestures' springs in about 0.3s", () => {
    for (const spring of [springs.boop, springs.hop, springs.shake]) {
      const { durationMs } = kick(spring);
      expect(durationMs).toBeGreaterThanOrEqual(200);
      expect(durationMs).toBeLessThanOrEqual(400);
    }
  });
});

describe("settle", () => {
  it("moves from 0 to 1 and stays there", () => {
    const { values } = settle(springs.follow);
    expect(values[0]).toBe(0);
    expect(values.at(-1)).toBe(1);
    expect(Math.max(...values)).toBeLessThanOrEqual(1.01);
  });
});
