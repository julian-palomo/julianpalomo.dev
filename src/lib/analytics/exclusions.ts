/**
 * Who is never counted (docs/analytics.md): anything off the production host,
 * known bots and headless browsers, and Julian's own browsers, which carry
 * the `notrack` cookie. Pure, so the server's checks are unit-tested.
 */
import { z } from "zod";

/** The one host whose visits are stored. Previews, `pnpm dev`, `pnpm preview` and e2e are dropped. */
const PRODUCTION_HOST = "julianpalomo.dev";

export function isProductionHost(host: string): boolean {
  return host === PRODUCTION_HOST;
}

/**
 * Crawlers, link-preview fetchers, monitors and headless browsers, matched on
 * the user agent. Most bots never run the page's JavaScript, so this only
 * catches the ones that do. The user agent itself is never stored.
 */
const BOT_PATTERN =
  /bot[/-]|\bbot\b|crawl|spider|slurp|headless|phantomjs|lighthouse|pagespeed|facebookexternalhit|whatsapp|embedly|preview|python-requests|curl\/|wget\/|go-http-client|node-fetch|axios\//i;

export function isBot(userAgent: string | null): boolean {
  return userAgent === null || userAgent.trim() === "" || BOT_PATTERN.test(userAgent);
}

/** Set by visiting `/?notrack`, deleted by `/?notrack=0`: the browser sends no events and gets no beacon. */
export const NOTRACK_COOKIE = "notrack";
export const NOTRACK_MAX_AGE = 365 * 24 * 60 * 60;

/** Whether a `notrack` cookie's value excludes the browser. */
export function hasNotrack(cookie: unknown): boolean {
  return z.literal("1").safeParse(cookie).success;
}

/**
 * What a `?notrack` parameter asks for, as the router parsed it: `/?notrack`
 * (empty) and any value but 0 set the cookie, `?notrack=0` deletes it. The
 * router parses JSON-looking values, so 0 arrives as a number.
 */
export function notrackParam(value: unknown): "set" | "clear" | null {
  if (value === undefined || value === null) return null;
  if (value === 0 || value === "0" || value === false || value === "false") return "clear";
  return "set";
}

/** One cookie's value from a request's `Cookie` header. */
export function cookieFrom(header: string | null, name: string): string | undefined {
  if (header === null) return undefined;
  for (const pair of header.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}
