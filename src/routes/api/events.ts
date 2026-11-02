import { env, waitUntil } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { handleEvents } from "../../lib/analytics/endpoint";

// The page's analytics beacon, sent with navigator.sendBeacon, so it is a
// plain route rather than a server function (.claude/rules/react-and-typescript.md).
// `env` holds the D1 binding; waitUntil lets the write finish after the
// 204 has gone. Without ANY, other methods would get the app's HTML shell
// with a 200.
export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      POST: ({ request }) => handleEvents(request, env, { waitUntil }),
      ANY: () => new Response(null, { status: 405, headers: { Allow: "POST" } }),
    },
  },
});
