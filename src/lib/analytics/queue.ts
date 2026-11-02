/**
 * The client's queue of events for one page load, pure so it is
 * unit-tested: the per-load cap, and splitting a flush into bodies small
 * enough for `navigator.sendBeacon`.
 */
import { type AnalyticsEvent, type EventBatch, MAX_EVENTS_PER_LOAD } from "./events";

/**
 * The most a body may weigh, in bytes. Browsers refuse a beacon once the
 * page's in-flight keepalive requests pass 64 KiB, so each chunk stays under
 * it with room for another. The server accepts far more (MAX_BODY_BYTES in
 * endpoint.ts), so a chunk the client sends is never refused for its size.
 */
export const MAX_CHUNK_BYTES = 60_000;

export type Queue = { recorded: number; pending: AnalyticsEvent[] };

export const EMPTY_QUEUE: Queue = { recorded: 0, pending: [] };

/** The queue with `event` added, or unchanged once the page load has recorded its 100 events. */
export function enqueue(queue: Queue, event: AnalyticsEvent): Queue {
  if (queue.recorded >= MAX_EVENTS_PER_LOAD) return queue;
  return { recorded: queue.recorded + 1, pending: [...queue.pending, event] };
}

const bytes = (text: string) => new TextEncoder().encode(text).length;

/**
 * The pending events as JSON bodies, in order, each at most `maxBytes`. An
 * event too big to fit any body on its own (a long question in many-byte
 * characters) goes alone in one, which the browser may refuse.
 */
export function chunkBodies(
  visitId: string,
  events: readonly AnalyticsEvent[],
  maxBytes = MAX_CHUNK_BYTES,
): { body: string; count: number }[] {
  const bodies: { body: string; count: number }[] = [];
  let current: AnalyticsEvent[] = [];
  const serialize = (list: AnalyticsEvent[]) =>
    JSON.stringify({ visit_id: visitId, events: list } satisfies EventBatch);
  for (const event of events) {
    const next = [...current, event];
    if (current.length > 0 && bytes(serialize(next)) > maxBytes) {
      bodies.push({ body: serialize(current), count: current.length });
      current = [event];
    } else {
      current = next;
    }
  }
  if (current.length > 0) bodies.push({ body: serialize(current), count: current.length });
  return bodies;
}
