/**
 * What the assistant's cow is doing, derived from the chat (DESIGN.md section
 * 9). Pure and free of React so every transition can be unit-tested.
 */
import type { ChatStatus } from "ai";

export type CowState =
  | "idle"
  | "listening"
  | "thinking"
  | "reading"
  | "talking"
  | "satisfied"
  | "sorry";

/** Everything in the chat the cow reacts to. */
export type CowSituation = {
  status: ChatStatus;
  /** The latest answer has typed at least one word onto the screen. */
  answerHasText: boolean;
  /** The latest answer is still typing itself out, even if its stream has ended. */
  revealing: boolean;
  /** The visitor pressed Stop on the last answer. */
  stopped: boolean;
  composer: { hasText: boolean; focused: boolean };
  /** While the page's entrance plays, what it makes the cow do; null once the chat leads. */
  entrance: CowState | null;
  /** A message to Julian just went through the contact form. */
  cheering?: boolean;
  /** The answer has kept the visitor waiting long enough, with no word on screen, for the notebook. */
  longWait?: boolean;
};

/** How long the one lick of `satisfied`, and of a pat, lasts. Keep in step with cow.css. */
export const LICK_MS = 1600;

/**
 * The cow's next state. It follows the typing, not the stream: it talks from
 * the first word on screen until the last, through a tool call or a pause in
 * the stream, and an answer that just finished typing plays `satisfied` once,
 * as does the entrance's greeting and a sent contact message. A long wait
 * before the first word turns its thinking into reading a notebook. The
 * entrance, while it plays, wins.
 * `previous` is what it showed last; the caller ends `satisfied` after
 * LICK_MS. Applying it twice to the same situation gives the same state.
 */
export function nextCowState(previous: CowState, situation: CowSituation): CowState {
  const { status, answerHasText, revealing, stopped, composer, entrance, cheering } = situation;
  const thinking = situation.longWait ? "reading" : "thinking";
  if (entrance !== null) return entrance;
  // A sent contact message licks too, unless an answer is on its way.
  const answering = status === "submitted" || status === "streaming" || revealing;
  if (cheering && !answering) return "satisfied";
  switch (status) {
    case "error":
      return "sorry";
    case "submitted":
      return thinking;
    case "streaming":
      return answerHasText ? "talking" : thinking;
    case "ready": {
      if (revealing && !stopped) return answerHasText ? "talking" : thinking;
      const listening = composer.hasText && composer.focused;
      const justAnswered =
        previous === "thinking" || previous === "reading" || previous === "talking";
      if (!stopped && !listening && (justAnswered || previous === "satisfied")) {
        return "satisfied";
      }
      return listening ? "listening" : "idle";
    }
    default: {
      const unhandled: never = status;
      throw new Error(String(unhandled));
    }
  }
}

/** How far the chat's cow tilts towards the pointer, in degrees, and towards a suggestion under it. */
export const FOLLOW_DEGREES = { pointer: 5, suggestion: 8 } as const;
// The pointer this far to one side, in px, gets the whole tilt.
const FOLLOW_REACH_PX = 320;

/**
 * The chat's cow's tilt towards a point `dx` px to the right of its chin
 * (negative: to the left), around its chin, as its own tilts turn. Further
 * away tilts more, up to the limit; it never turns its head away.
 */
export function followTilt(dx: number, overSuggestion: boolean): number {
  const most = overSuggestion ? FOLLOW_DEGREES.suggestion : FOLLOW_DEGREES.pointer;
  return most * Math.max(-1, Math.min(1, dx / FOLLOW_REACH_PX));
}
