import { createRouter } from "@tanstack/react-router";
import { pageChange } from "./lib/page-transition";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    // A change of page runs as a view transition (src/styles/transitions.css),
    // the browser's back button included. Where the browser supports
    // view-transition types, `false` skips it for everything else; where it
    // doesn't, those few navigations get the same short cross-fade.
    defaultViewTransition: {
      types: ({ fromLocation, toLocation }) =>
        pageChange(fromLocation?.pathname, toLocation.pathname, prefersReducedMotion()),
    },
  });
}

// Only called in the browser, on a navigation.
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
