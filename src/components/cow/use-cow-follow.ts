import { type RefObject, useEffect } from "react";
import { followTilt } from "../../lib/cow-state";
import { atRest, type SpringState, springs, stepSpring } from "../../lib/spring";
import { isMouseHover, motionReduced } from "../ui/motion";

// Where its chin is in the drawing (viewBox 5 26 190 150): the point its
// tilts turn around. Keep in step with `.cow .tilt` in src/styles/cow.css.
const CHIN = { x: 0.5, y: 0.69 };

/**
 * The chat's cow tilting a little towards a mouse anywhere on the page, and
 * a little more towards a suggestion under it (DESIGN.md section 9). A
 * spring moves it, one step a frame, while it has somewhere to go; the tilt
 * reaches `src/styles/cow.css` as `--cow-follow` on `holder`, which applies
 * it only where it may move. Nothing with reduced motion or on touch.
 */
export function useCowFollow(holder: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let target = 0;
    let spring: SpringState = { value: 0, velocity: 0 };
    let frame = 0;
    let last = 0;

    function tick(time: number) {
      const element = holder.current;
      // At most 1/20s a step: a frame after a pause shouldn't fling it.
      const seconds = last ? Math.min(0.05, (time - last) / 1000) : 1 / 60;
      last = time;
      spring = stepSpring(spring, target, springs.follow, seconds);
      if (atRest(spring, target)) spring = { value: target, velocity: 0 };
      element?.style.setProperty("--cow-follow", `${spring.value.toFixed(2)}deg`);
      frame = atRest(spring, target) ? 0 : requestAnimationFrame(tick);
      if (!frame) last = 0;
    }

    function aim(next: number) {
      target = next;
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function move(event: PointerEvent) {
      const element = holder.current;
      if (!element || !isMouseHover(event) || motionReduced()) return;
      const cow = element.getBoundingClientRect();
      const chinX = cow.left + cow.width * CHIN.x;
      const suggestion =
        event.target instanceof Element ? event.target.closest("[data-suggestion]") : null;
      if (suggestion) {
        const chip = suggestion.getBoundingClientRect();
        aim(followTilt(chip.left + chip.width / 2 - chinX, true));
      } else {
        aim(followTilt(event.clientX - chinX, false));
      }
    }

    // The mouse leaving the window: the cow goes back to looking ahead.
    function leave(event: PointerEvent) {
      if (event.relatedTarget === null) aim(0);
    }

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", leave);
      cancelAnimationFrame(frame);
    };
  }, [holder]);
}
