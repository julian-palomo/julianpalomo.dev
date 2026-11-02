import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { handleTranscribe } from "../../lib/voice/endpoint";

// A recorded question in, its text out (src/lib/voice/endpoint.ts). `env`
// holds the Workers AI and D1 bindings and the salt. Without ANY, other
// methods would get the app's HTML shell with a 200.
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: ({ request }) => handleTranscribe(request, env),
      ANY: () => new Response(null, { status: 405, headers: { Allow: "POST" } }),
    },
  },
});
