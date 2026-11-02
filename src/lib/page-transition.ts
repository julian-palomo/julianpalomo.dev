/**
 * Which navigations animate as a change of page (DESIGN.md section 11): the
 * router asks this for every navigation (src/router.tsx). Pure, so it's
 * unit-tested.
 */

/** A path's page, whatever its language: `/es/projects` and `/projects` are both `/projects`. */
export function pageOf(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/es") return "/";
  return path.startsWith("/es/") ? path.slice(3) : path;
}

/**
 * The view transition's types for a navigation from `from` to `to`
 * (pathnames): `["page"]` when it goes to another page, or `false` for no
 * transition. Not for the first load, a switch to the same page in the other
 * language, a change of search or hash only (`?ref=` and `#ask` being tidied
 * up), or with reduced motion.
 */
export function pageChange(
  from: string | undefined,
  to: string,
  reducedMotion: boolean,
): ["page"] | false {
  if (reducedMotion || from === undefined) return false;
  return pageOf(from) === pageOf(to) ? false : ["page"];
}
