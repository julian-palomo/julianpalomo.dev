/**
 * The ring on How it's built: how a question is answered, as five stops on a
 * circle, with the confirmed facts in the centre and the suggested questions'
 * shortcut on a chord (DESIGN.md section 18). Pure, so it can be unit-tested;
 * `src/components/how/Ring.tsx` draws it.
 */
import type { Doc } from "./docs";

/** The stops, clockwise from the top. */
export const RING_STOPS = ["question", "limits", "claude", "check", "answer"] as const;
export type RingStop = (typeof RING_STOPS)[number];

/** Everything that can be selected, in reading order: the stops, the centre, the shortcut. */
export const RING_ITEMS = [...RING_STOPS, "facts", "shortcut"] as const;
export type RingItem = (typeof RING_ITEMS)[number];

export const RING_DOCS: Record<RingItem, Doc> = {
  question: "docs/architecture.md",
  limits: "docs/architecture.md",
  claude: "docs/architecture.md",
  check: ".claude/rules/claims.md",
  answer: "docs/architecture.md",
  facts: ".claude/rules/claims.md",
  shortcut: "docs/adr/2026-11-02-cached-suggestion-answers.md",
};

/** How long autoplay stays on a stop. */
export const AUTOPLAY_MS = 2800;

/** The stop's angle, in degrees clockwise from the top. */
export function stopAngle(stop: RingStop): number {
  return (RING_STOPS.indexOf(stop) * 360) / RING_STOPS.length;
}

/** The stop after `stop`, going round: after the last comes the first. */
export function nextStop(stop: RingStop): RingStop {
  const next = RING_STOPS[(RING_STOPS.indexOf(stop) + 1) % RING_STOPS.length];
  // The modulo keeps the index inside the tuple.
  return next ?? RING_STOPS[0];
}

/**
 * A point on a circle of `radius` round (`cx`, `cy`), at `angle` degrees
 * clockwise from the top, in SVG coordinates (y grows downwards).
 */
export function ringPoint(
  angle: number,
  radius: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.sin(radians), y: cy - radius * Math.cos(radians) };
}

/**
 * What the ring shows: the selected item (its card), the stop the dot sits
 * on, and the dot's rotation in degrees. The rotation only ever grows, so the
 * dot always turns clockwise: from the last stop to the first it goes on
 * round, never back.
 */
export type RingState = { selected: RingItem; stop: RingStop; rotation: number };

export const RING_START: RingState = { selected: "question", stop: "question", rotation: 0 };

/**
 * The ring with `item` selected. A stop moves the dot forward to it; the
 * centre and the shortcut leave the dot where it is, so autoplay goes on from
 * the stop after it.
 */
export function selectItem(state: RingState, item: RingItem): RingState {
  if (item === "facts" || item === "shortcut") return { ...state, selected: item };
  const current = ((state.rotation % 360) + 360) % 360;
  const turn = (stopAngle(item) - current + 360) % 360;
  return { selected: item, stop: item, rotation: state.rotation + turn };
}

/** Autoplay's next move: the stop after the dot's. */
export function advance(state: RingState): RingState {
  return selectItem(state, nextStop(state.stop));
}
