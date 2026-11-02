import type { PointerEvent } from "react";
import { type Curve, kick, type Spring } from "../../lib/spring";

/*
 * The buttons' gestures on hover, the "boop" (DESIGN.md section 11,
 * "Springs"): a part of the button is pushed by a spring and springs back to
 * rest, in about 0.3s. Played with the Web Animations API from the spring's
 * samples, so CSS never has to describe a spring; only `transform` and
 * `opacity` move.
 */

type Part = {
  /** The `data-boop` name of what moves: the element hovered, or what's inside it (or `within`). */
  part: string;
  /** Its keyframe at the spring's value: 0 at rest, 1 at the furthest. */
  frame: (value: number) => Keyframe;
  spring: Spring;
  /** Milliseconds from one element to the next, when several have this part. */
  stagger?: number;
};

export type Gesture = {
  parts: readonly Part[];
  /** Look for the parts in the closest ancestor matching this, not in the element hovered. */
  within?: string;
};

const ID = "boop";
const curves = new Map<Spring, Curve>();

function curveOf(spring: Spring): Curve {
  const known = curves.get(spring);
  if (known) return known;
  const curve = kick(spring);
  curves.set(spring, curve);
  return curve;
}

/**
 * Whether the pointer is a mouse that hovers. Hover gestures never play on
 * touch: a phone fires pointerenter on a tap, just before the click.
 */
export function isMouseHover(event: { pointerType: string }): boolean {
  return event.pointerType === "mouse" && matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Read at the moment it's needed, so a change in the OS setting applies at once. */
export function motionReduced(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The handler that plays a gesture when a mouse moves onto the element. */
export function boopOnHover(gesture: Gesture) {
  return (event: PointerEvent<Element>) => {
    if (!isMouseHover(event) || motionReduced()) return;
    // A disabled button has nothing to offer, so it doesn't invite a press.
    if (event.currentTarget.matches(":disabled")) return;
    const root = gesture.within ? event.currentTarget.closest(gesture.within) : event.currentTarget;
    if (!root) return;
    for (const { part, frame, spring, stagger = 0 } of gesture.parts) {
      const { values, durationMs } = curveOf(spring);
      const keyframes = values.map(frame);
      const selector = `[data-boop="${part}"]`;
      const targets = root.matches(selector) ? [root] : [...root.querySelectorAll(selector)];
      targets.forEach((element, index) => {
        // A gesture still running finishes as it is; it never jumps back to start.
        if (element.getAnimations().some((animation) => animation.id === ID)) return;
        const animation = element.animate(keyframes, {
          duration: durationMs,
          delay: index * stagger,
          easing: "linear",
          id: ID,
        });
        animation.onfinish = () => animation.cancel();
      });
    }
  };
}
