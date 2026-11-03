import { defineConfig, devices } from "@playwright/test";
import { ENTRANCE_COOKIE } from "./src/lib/entrance";
import { e2ePort } from "./tests/e2e/port";

// The folder of this file, the worktree's root wherever the command runs from;
// never process.cwd(), which would give one worktree several ports.
const port = e2ePort(process.env, import.meta.dirname);
const isCI = Boolean(process.env.CI);

// Once, from the runner: the workers load this file too.
if (process.env.TEST_WORKER_INDEX === undefined) {
  console.log(`e2e: serving on http://localhost:${port} (set E2E_PORT to choose another)`);
}

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // A demo answer is whole about 6.5s after it's asked: 0.6s to the lookup,
  // 3.5s held back (src/lib/bot/demo.ts), then the words typing themselves
  // out. The default 5s would race it, and 10s would leave too little room
  // on a slow runner.
  expect: { timeout: 15_000 },
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
  // so a test run never calls the real model. The preview gets CLOUDFLARE_ENV
  // too, so vite.config.ts leaves the Workers inspector off for it.
  webServer: {
    command: `CLOUDFLARE_ENV=e2e pnpm build && CLOUDFLARE_ENV=e2e pnpm preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    // Never reuse a server: one already on this port is another run of this
    // worktree, a `pnpm preview`, or another worktree whose folder hashed to
    // the same port, and reusing it would test a build this run didn't make.
    // A run that finds the port taken fails at once with "already used":
    // wait for the other run, or set E2E_PORT. --strictPort covers two runs
    // racing.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
