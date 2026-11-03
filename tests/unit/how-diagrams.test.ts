import { describe, expect, it } from "vitest";
import { CYCLE_STEPS, isLastStep, nextStep, previousStep } from "../../src/lib/how/cycle";
import {
  advance,
  nextStop,
  RING_START,
  RING_STOPS,
  ringPoint,
  selectItem,
  stopAngle,
} from "../../src/lib/how/ring";

describe("the ring", () => {
  it("spreads the five stops evenly, clockwise from the top", () => {
    expect(RING_STOPS.map(stopAngle)).toEqual([0, 72, 144, 216, 288]);
  });

  it("puts a point at the top, right, bottom and left of the circle", () => {
    const at = (angle: number) => {
      const { x, y } = ringPoint(angle, 10, 50, 50);
      return [Math.round(x), Math.round(y)];
    };
    expect(at(0)).toEqual([50, 40]);
    expect(at(90)).toEqual([60, 50]);
    expect(at(180)).toEqual([50, 60]);
    expect(at(270)).toEqual([40, 50]);
  });

  it("goes from the last stop to the first", () => {
    expect(nextStop("check")).toBe("answer");
    expect(nextStop("answer")).toBe("question");
  });

  it("turns the dot forward to the stop that is selected", () => {
    const state = selectItem(RING_START, "claude");
    expect(state).toEqual({ selected: "claude", stop: "claude", rotation: 144 });
  });

  it("keeps turning clockwise from the last stop to the first, never back", () => {
    let state = RING_START;
    for (let step = 0; step < 5; step += 1) state = advance(state);
    expect(state.stop).toBe("question");
    expect(state.rotation).toBe(360);
  });

  it("goes on round to a stop behind the dot", () => {
    const at = selectItem(RING_START, "check");
    expect(selectItem(at, "limits").rotation).toBe(360 + 72);
  });

  it("leaves the dot where it is for the centre and the shortcut, and goes on from there", () => {
    const at = selectItem(RING_START, "limits");
    const facts = selectItem(at, "facts");
    expect(facts).toEqual({ ...at, selected: "facts" });
    expect(selectItem(facts, "shortcut").stop).toBe("limits");
    expect(advance(facts).selected).toBe("claude");
  });

  it("doesn't move the dot when its own stop is selected again", () => {
    const at = selectItem(RING_START, "claude");
    expect(selectItem(at, "claude").rotation).toBe(at.rotation);
  });
});

describe("the cycle", () => {
  it("has ten steps, each starting where the one before it ended", () => {
    expect(CYCLE_STEPS).toHaveLength(10);
    CYCLE_STEPS.slice(1).forEach((step, index) => {
      expect(step.from).toBe(CYCLE_STEPS[index]?.to);
    });
  });

  it("starts again after the last step", () => {
    expect(nextStep(0)).toBe(1);
    expect(isLastStep(9)).toBe(true);
    expect(nextStep(9)).toBe(0);
  });

  it("has no step before the first", () => {
    expect(previousStep(1)).toBe(0);
    expect(previousStep(0)).toBe(0);
  });
});
