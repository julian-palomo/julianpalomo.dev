/**
 * POST /api/events: the page's analytics beacon (docs/analytics.md). It
 * takes the request, the environment and the runtime's waitUntil, so it is
 * tested with an in-memory store and a fake waitUntil. In order:
 *
 * 1. a body over MAX_BODY_BYTES, or one that isn't a valid batch: 400;
 * 2. off the production host, a bot's user agent, or the `notrack` cookie:
 *    204, and nothing is stored;
 * 3. no D1 binding: 503;
 * 4. otherwise 204, and the batch is stored, then old rows pruned, after
 *    the response.
 *
 * The response never says whether a batch was stored.
 */
import { z } from "zod";
import { batchSchema } from "./events";
import { cookieFrom, hasNotrack, isBot, isProductionHost, NOTRACK_COOKIE } from "./exclusions";
import { d1EventStore, type EventStore, isEventsDb } from "./store";

/**
 * Fits a full batch of 100 questions of 1,000 characters, even at 3 bytes a
 * character, with room for the JSON around them. The client sends far
 * smaller chunks (MAX_CHUNK_BYTES in queue.ts).
 */
const MAX_BODY_BYTES = 400_000;

// Checked with isEventsDb where it is used. Optional, since previews and e2e have no D1.
const envSchema = z.object({ DB: z.unknown().optional() });

type Deps = {
  waitUntil: (promise: Promise<unknown>) => void;
  now?: () => number;
  /** Tests pass an in-memory store; the route gets D1's. */
  createStore?: (db: unknown) => EventStore | null;
};

const defaultStore = (db: unknown) => (isEventsDb(db) ? d1EventStore(db) : null);

const empty = (status: number) => new Response(null, { status });

export async function handleEvents(
  request: Request,
  rawEnv: Record<string, unknown>,
  { waitUntil, now = Date.now, createStore = defaultStore }: Deps,
): Promise<Response> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return empty(400);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return empty(400);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return empty(400);
  }
  const batch = batchSchema.safeParse(json);
  if (!batch.success) return empty(400);

  if (!isProductionHost(new URL(request.url).hostname)) return empty(204);
  if (isBot(request.headers.get("user-agent"))) return empty(204);
  if (hasNotrack(cookieFrom(request.headers.get("cookie"), NOTRACK_COOKIE))) return empty(204);

  const store = createStore(envSchema.parse(rawEnv).DB);
  if (store === null) return empty(503);

  const at = now();
  const { visit_id, events } = batch.data;
  waitUntil(
    (async () => {
      try {
        await store.record(visit_id, events, at);
      } catch (error) {
        console.error("events: insert failed", error);
        return;
      }
      try {
        await store.prune(at);
      } catch (error) {
        console.error("events: prune failed", error);
      }
    })(),
  );
  return empty(204);
}
