import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  getRequest,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { z } from "zod";
import {
  hasNotrack,
  isProductionHost,
  NOTRACK_COOKIE,
  NOTRACK_MAX_AGE,
  notrackParam,
} from "./analytics/exclusions";
import { ENTRANCE_COOKIE, entranceCookie, entranceKind } from "./entrance";
import { parseSoundCookie, SOUND_COOKIE } from "./sound/cookie";
import { parseThemeCookie, THEME_COOKIE } from "./theme";

// Set for previews and e2e only (wrangler.jsonc), never in production.
// ANALYTICS_BEACON_ANY_HOST is e2e's alone: it renders Web Analytics' beacon
// off the production host, so a test can check that `?notrack` removes it.
const envSchema = z.object({
  SCENE_OVERRIDE: z.string().optional().catch(undefined),
  CONTACT_DEMO: z.string().optional().catch(undefined),
  ANALYTICS_BEACON_ANY_HOST: z.string().optional().catch(undefined),
});

/** The page's `?notrack`, as the router parsed it (notrackParam). */
const inputSchema = z.object({ notrack: z.unknown().optional() });

/**
 * What the first render depends on, read on the server: the visitor's stored
 * theme and sound choice, the request's time, whether `?sky=` may set the
 * landscape, which entrance the page plays, whether the contact form uses
 * Turnstile's test keys, and whether this browser is counted. The client's
 * clock starts from this `now`, so its first render matches the server's
 * HTML. The entrance's cookie is refreshed here on every visit, so the first
 * HTML already knows the entrance. A theme cookie that no longer holds a
 * choice (over, or the old one-year format) is deleted in the same response,
 * and so is the `notrack` cookie on `?notrack=0`; `?notrack` sets it, so the
 * very first HTML already leaves the beacon out.
 */
export const getFirstRender = createServerFn({ method: "GET" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    // Imported here so the Workers runtime module stays out of the browser bundle.
    const { env } = await import("cloudflare:workers");
    const vars = envSchema.parse(env);
    const now = Date.now();
    const secure = getRequestProtocol() === "https";
    const entrance = entranceKind(getCookie(ENTRANCE_COOKIE));
    const cookie = entranceCookie({ secure });
    setCookie(cookie.name, cookie.value, cookie.options);
    const stored = getCookie(THEME_COOKIE);
    const choice = parseThemeCookie(stored, now);
    // The same attributes rememberChoice sets (src/lib/cookie.ts), or the
    // browser keeps the old cookie.
    if (stored !== undefined && choice === null) {
      deleteCookie(THEME_COOKIE, { path: "/", sameSite: "lax", secure });
    }
    const track = trackChoice(notrackParam(data.notrack), getCookie(NOTRACK_COOKIE), secure);
    const host = new URL(getRequest().url).hostname;
    return {
      choice,
      sound: parseSoundCookie(getCookie(SOUND_COOKIE)),
      now,
      sceneOverride: vars.SCENE_OVERRIDE === "1",
      entrance,
      contactDemo: vars.CONTACT_DEMO === "1",
      track,
      beacon: track && (isProductionHost(host) || vars.ANALYTICS_BEACON_ANY_HOST === "1"),
    };
  });

/** Whether this browser is counted, after applying `?notrack` to its cookie. */
function trackChoice(param: "set" | "clear" | null, cookie: unknown, secure: boolean): boolean {
  // httpOnly: only the server reads it, here and in /api/events.
  const options = { path: "/", sameSite: "lax", httpOnly: true, secure } as const;
  if (param === "set") {
    setCookie(NOTRACK_COOKIE, "1", { ...options, maxAge: NOTRACK_MAX_AGE });
    return false;
  }
  if (param === "clear") {
    if (cookie !== undefined) deleteCookie(NOTRACK_COOKIE, options);
    return true;
  }
  return !hasNotrack(cookie);
}
