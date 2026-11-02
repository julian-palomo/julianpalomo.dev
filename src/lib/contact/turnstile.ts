/**
 * Cloudflare Turnstile: the site keys the page renders the widget with, and
 * the server's check of the token it produces, with the siteverify endpoint
 * (developers.cloudflare.com/turnstile/get-started/server-side-validation/).
 */
import { z } from "zod";

/** The widget for julianpalomo.dev. Public: it's the one that goes in the page. */
export const SITE_KEY = "0x4AAAAAAFs5zd5aOe5srtgl";

/**
 * Cloudflare's documented test keys, which always pass, for previews and e2e.
 * The test site key gives a dummy token that only the test secret accepts,
 * and a production secret rejects it, so they can't open the real form.
 */
export const TEST_SITE_KEY = "1x00000000000000000000AA";
export const TEST_SECRET = "1x0000000000000000000000000000000AA";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 10_000;

const siteverifySchema = z.object({ success: z.boolean() });

export type TurnstileVerdict = "ok" | "rejected" | "unreachable";

/**
 * Whether Turnstile confirms the token came from a person. "unreachable" when
 * siteverify can't be asked or its answer can't be read. Never throws, and
 * never logs the token or the IP.
 */
export async function verifyTurnstile(
  token: string,
  ip: string | undefined,
  secret: string,
  fetchFn: typeof fetch,
): Promise<TurnstileVerdict> {
  try {
    const response = await fetchFn(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = siteverifySchema.safeParse(await response.json());
    if (!body.success) return "unreachable";
    return body.data.success ? "ok" : "rejected";
  } catch {
    // A network error, a timeout or a body that isn't JSON: the visitor can try again.
    return "unreachable";
  }
}
