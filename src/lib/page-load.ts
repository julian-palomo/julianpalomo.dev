import { useEffect } from "react";

/**
 * Whether a page of the site has already rendered in this page load, in the
 * browser. Each page marks it once it has mounted (`useMarkPageRendered`), so
 * a page reached later by a client navigation, such as the home page after
 * "← Ask the cow", knows it isn't the first and skips the entrance.
 *
 * Marked by the pages, never by the root document: a route's component
 * hydrates after the root's, so the root's effect would run first and the
 * home page would wrongly skip the entrance its server HTML already started.
 * Never marked on the server, where effects don't run.
 */
let rendered = false;

export function pageRenderedBefore(): boolean {
  return rendered;
}

/** Marks, once the calling page has mounted, that a page has rendered in this page load. */
export function useMarkPageRendered(): void {
  useEffect(() => {
    rendered = true;
  }, []);
}
