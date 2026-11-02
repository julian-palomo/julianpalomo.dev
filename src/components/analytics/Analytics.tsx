import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type AnalyticsEvent, eventSchema, referrerHost } from "../../lib/analytics/events";
import { chunkBodies, EMPTY_QUEUE, enqueue, type Queue } from "../../lib/analytics/queue";

type Track = (event: AnalyticsEvent) => void;

// Without a provider (the link preview card), recording does nothing.
const TrackContext = createContext<Track>(() => {});

/** Records one of the site's analytics events (src/lib/analytics/events.ts). Never throws and never waits. */
export function useTrack(): Track {
  return useContext(TrackContext);
}

type Props = {
  /** False for a browser with the `notrack` cookie: nothing is recorded or sent. Read once, on mount. */
  on: boolean;
  /** The page load's `visit` event, recorded on mount, without the referrer the provider reads itself. */
  visit: Omit<Extract<AnalyticsEvent, { name: "visit" }>, "referrer_host">;
  children: ReactNode;
};

/**
 * The page load's analytics (docs/analytics.md). Its id is a random UUID made
 * on mount and kept in memory only, never in a cookie or storage, so a page
 * load's events join into a funnel without following anyone across visits.
 * Events wait in a queue, at most 100 per page load, and go to /api/events
 * with navigator.sendBeacon when the page is hidden or left. A chunk the
 * browser refuses stays queued for the next flush.
 */
export function Analytics({ on, visit, children }: Props) {
  const [enabled] = useState(on);
  const [firstVisit] = useState(visit);
  const queue = useRef<Queue>(EMPTY_QUEUE);
  const visitId = useRef<string | null>(null);

  // A malformed event would get the whole batch refused, so it's dropped here.
  const track = useCallback<Track>(
    (event) => {
      if (!enabled) return;
      try {
        const parsed = eventSchema.safeParse(event);
        if (parsed.success) queue.current = enqueue(queue.current, parsed.data);
      } catch {
        // Recording must never break the page; a lost event is acceptable.
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    visitId.current = crypto.randomUUID();
    track({
      ...firstVisit,
      referrer_host: referrerHost(document.referrer, location.hostname),
    });

    const flush = () => {
      try {
        const id = visitId.current;
        const pending = queue.current.pending;
        if (id === null || pending.length === 0) return;
        let sent = 0;
        for (const { body, count } of chunkBodies(id, pending)) {
          if (!navigator.sendBeacon("/api/events", body)) break;
          sent += count;
        }
        queue.current = { ...queue.current, pending: queue.current.pending.slice(sent) };
      } catch {
        // No sendBeacon, or it threw: the events stay queued for the next flush.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, firstVisit, track]);

  return <TrackContext value={track}>{children}</TrackContext>;
}
