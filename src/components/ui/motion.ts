/**
 * What the visitor's device allows to move, read at the moment it's needed,
 * so a change in the OS setting applies at once.
 */

/**
 * The visitor asks for reduced motion (DESIGN.md section 11). Safe while
 * rendering: on the server, with no device to ask, it says no, as the
 * chat's first render needs.
 */
export function motionReduced(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Whether the pointer is a mouse that hovers. Hover gestures never play on
 * touch: a phone fires pointerenter on a tap, just before the click.
 */
export function isMouseHover(event: { pointerType: string }): boolean {
  return (
    event.pointerType === "mouse" && window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}
