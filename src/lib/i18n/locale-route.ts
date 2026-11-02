import { redirect } from "@tanstack/react-router";
import { rootLanguage } from "./root-language";

/** The routes that exist in both languages, at the same path with `/es` in front. */
type LocaleRoute = "/{-$locale}" | "/{-$locale}/projects";

/**
 * A route's `beforeLoad`: an English URL sends a visitor whose `lang` cookie
 * or country says Spanish to the same page under `/es` (DESIGN.md section 5).
 * A URL under `/es` is always Spanish.
 */
export function redirectToSpanish(to: LocaleRoute, locale: string | undefined): void {
  if (locale !== undefined || rootLanguage() !== "es") return;
  // 302, never cached: it depends on the visitor's cookie and country. The
  // query string comes along, so a shared link keeps its parameters.
  throw redirect({
    to,
    params: { locale: "es" },
    search: true,
    statusCode: 302,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
