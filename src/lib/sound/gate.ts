/**
 * When a sound may play (DESIGN.md section 12): never before the visitor's
 * first interaction, no two within 150ms, and the cow's moo at most once
 * every 3s. Pure, with the time passed in, so the rules are unit-tested.
 */
import type { SoundMoment } from "./moments";

export const MIN_GAP_MS = 150;
export const MOO_GAP_MS = 3000;

export type GateState = {
  /** The visitor has tapped, clicked or pressed a key on the page. */
  interacted: boolean;
  lastSound: number | null;
  lastMoo: number | null;
};

export const closedGate: GateState = { interacted: false, lastSound: null, lastMoo: null };

/** Whether `moment` may play at `now`, and the gate's state afterwards. */
export function passGate(
  state: GateState,
  moment: SoundMoment,
  now: number,
): { play: boolean; state: GateState } {
  const tooSoon = state.lastSound !== null && now - state.lastSound < MIN_GAP_MS;
  const mooTooSoon = moment === "moo" && state.lastMoo !== null && now - state.lastMoo < MOO_GAP_MS;
  if (!state.interacted || tooSoon || mooTooSoon) return { play: false, state };
  return {
    play: true,
    state: { ...state, lastSound: now, lastMoo: moment === "moo" ? now : state.lastMoo },
  };
}
