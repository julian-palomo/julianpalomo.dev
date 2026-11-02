/*
 * A small damped spring (DESIGN.md section 11, "Springs"): the physics behind
 * the buttons' gestures and the valley's reactions to the pointer. Gestures
 * sample it into keyframes for the Web Animations API; the things that follow
 * the pointer step it once a frame.
 */

export type Spring = {
  /** How hard it pulls towards its target. */
  stiffness: number;
  /** How quickly it loses speed: less overshoots more. */
  damping: number;
  mass: number;
};

export type SpringState = { value: number; velocity: number };

// A fixed step keeps the result the same at any frame rate, and stable at
// the stiffest springs here (a shake).
const STEP = 1 / 240;

/** The spring after `seconds`, pulled towards `target`. */
export function stepSpring(
  state: SpringState,
  target: number,
  spring: Spring,
  seconds: number,
): SpringState {
  let { value, velocity } = state;
  for (let left = seconds; left > 1e-9; left -= STEP) {
    const dt = Math.min(STEP, left);
    const force = -spring.stiffness * (value - target) - spring.damping * velocity;
    velocity += (force / spring.mass) * dt;
    value += velocity * dt;
  }
  return { value, velocity };
}

/** Whether it has come to rest on its target: less than 0.001 away and nearly still. */
export function atRest(state: SpringState, target: number): boolean {
  return Math.abs(state.value - target) < 1e-3 && Math.abs(state.velocity) < 1e-2;
}

/** A spring's movement, sampled every `FRAME_MS`, and how long it lasts. */
export type Curve = { values: number[]; durationMs: number };

const FRAME_MS = 1000 / 60;
// Every spring here settles well inside this; it only stops a bad config looping.
const LONGEST_MS = 2000;

function sample(start: SpringState, target: number, spring: Spring): Curve {
  // Its natural speed: what "nearly still" means for this spring.
  const speed = Math.sqrt(spring.stiffness / spring.mass);
  let state = start;
  const values = [state.value];
  let elapsed = 0;
  while (elapsed < LONGEST_MS) {
    state = stepSpring(state, target, spring, FRAME_MS / 1000);
    elapsed += FRAME_MS;
    values.push(state.value);
    if (Math.abs(state.value - target) < 0.01 && Math.abs(state.velocity) < 0.05 * speed) break;
  }
  values[values.length - 1] = target;
  return { values, durationMs: Math.round(elapsed) };
}

/**
 * A push from rest, as in a boop: from 0 out to 1 and back to rest at 0,
 * overshooting past it as much as the damping allows. Scaled so its furthest
 * point is exactly 1, so a gesture says how far it goes at that point.
 */
export function kick(spring: Spring): Curve {
  // Pushed at its natural speed, so it travels about as far as a settle does
  // and the same "close enough" fits both.
  const push = Math.sqrt(spring.stiffness / spring.mass);
  const { values, durationMs } = sample({ value: 0, velocity: push }, 0, spring);
  const peak = Math.max(...values.map(Math.abs));
  return { values: values.map((value) => value / peak), durationMs };
}

/** A move from 0 to 1 that settles, as in a head turning to look and holding there. */
export function settle(spring: Spring): Curve {
  return sample({ value: 0, velocity: 0 }, 1, spring);
}

/**
 * The springs in use. A gesture's push settles in about 0.3s; the followers
 * are slower, so they lag the pointer a little.
 */
export const springs = {
  /** Out and back, springing a little past rest: the gear, the toggles, Send. */
  boop: { stiffness: 700, damping: 24, mass: 1 },
  /** Out and back with no visible overshoot: a hop or a rise. */
  hop: { stiffness: 380, damping: 34, mass: 1 },
  /** Back and forth, quickly: a shake, a rock or a pine brushed past. */
  shake: { stiffness: 3000, damping: 22, mass: 1 },
  /** The chat's cow tilting after the pointer, and a herd cow's head turning. */
  follow: { stiffness: 120, damping: 18, mass: 1 },
  /** The midges' cloud: lazy, a swarm a little behind the pointer. */
  swarm: { stiffness: 30, damping: 9, mass: 1 },
} as const satisfies Record<string, Spring>;
