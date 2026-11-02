import { defineConfig, devices } from "@playwright/test";
import { ENTRANCE_COOKIE } from "./src/lib/entrance";

const port = 4173;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
    // Every test is a later visit, so it gets the short entrance and never
    // waits for the first visit's (tests/e2e/entrance.spec.ts clears it).
    // Reduced motion would skip it too, but it also stills the cow and the
    // answer's typing, which other tests check.
    storageState: {
      cookies: [
        {
          name: ENTRANCE_COOKIE,
          value: "1",
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // The e2e build renders Web Analytics' beacon on any host
        // (ANALYTICS_BEACON_ANY_HOST in wrangler.jsonc), so a test can check
        // `?notrack` removes it. Its host never resolves here, so a test run
        // never loads it or reports a visit to Cloudflare with the real token.
        launchOptions: {
          args: ["--host-resolver-rules=MAP static.cloudflareinsights.com ~NOTFOUND"],
        },
      },
    },
  ],
  // Runs against a production build served by the Workers runtime, not the dev
  // server. CLOUDFLARE_ENV=e2e builds with wrangler.jsonc's `e2e` environment:
  // the chat answers in demo mode and no local .dev.vars key reaches the build,
  // so a test run never calls the real model.
  webServer: {
    command: `CLOUDFLARE_ENV=e2e pnpm build && pnpm preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    // Never reuse a server: several worktrees share port 4173, and reusing one
    // would test another worktree's build. A run that finds the port taken
    // fails at once with "already used"; --strictPort covers two runs racing.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
