import { type RefObject, useLayoutEffect, useState } from "react";

/**
 * The view-transition names elements share across pages
 * (src/styles/transitions.css), as Tailwind classes written out in full so
 * Tailwind finds them. A name may be on one element per page only, as the API
 * requires.
 */

/**
 * The landscape's box, tall on the home page and short on inner pages. A
 * named element is a stacking context, which would keep the entrance's hero
 * bubble (z-20) under the hero cow (z-10, later in the page), so the hero
 * has no name while the entrance plays.
 */
const HERO_TRANSITION = "[view-transition-name:hero] in-data-entrance:[view-transition-name:none]";

/** The hero's row of controls, the same size on every page, so it moves without stretching. */
const CONTROLS_TRANSITION =
  "[view-transition-name:hero-controls] in-data-entrance:[view-transition-name:none]";

/**
 * The home page's portrait, which overlaps the hero's lower edge. In the root
 * snapshot it would paint under the hero's group, which covers its top half
 * as the hero grows, then jump back whole when the transition ends. Its own
 * group paints above the hero's, and inner pages have none, so it fades in
 * or out in place. No name while the entrance plays, like the hero's.
 */
export const PORTRAIT_TRANSITION =
  "[view-transition-name:portrait] in-data-entrance:[view-transition-name:none]";

/** A page's name on its home card and its title tab on the page: the one becomes the other. */
export const PAGE_TITLE_TRANSITION = {
  projects: "[view-transition-name:page-title-projects]",
  "how-its-built": "[view-transition-name:page-title-how-its-built]",
} as const;

/**
 * The hero's and its controls' names, only while the hero is on screen. A
 * named element off screen still morphs from where it was, so a hero
 * scrolled away would slide in from above the page instead of changing
 * height; without its name it simply cross-fades with the rest.
 */
export function useHeroTransition(hero: RefObject<HTMLElement | null>): {
  hero: string;
  controls: string;
} {
  // On screen at first: a page loads, or a navigation lands, at its top.
  const [inView, setInView] = useState(true);
  useLayoutEffect(() => {
    const element = hero.current;
    if (!element) return;
    const box = element.getBoundingClientRect();
    setInView(box.bottom > 0 && box.top < window.innerHeight);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setInView(entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hero]);
  return inView
    ? { hero: HERO_TRANSITION, controls: CONTROLS_TRANSITION }
    : { hero: "", controls: "" };
}
