import { appendFileSync } from "node:fs";
import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// React Compiler experiment branch only: with REACT_COMPILER_LOG set, every
// compiler event goes to that file as a JSON line, for the ADR's report.
const logFile = process.env.REACT_COMPILER_LOG;
const logger = logFile
  ? {
      logEvent(filename: string | null, event: { kind: string }) {
        appendFileSync(logFile, `${JSON.stringify({ filename, ...event })}\n`);
      },
    }
  : undefined;

// Plugin order follows Cloudflare's TanStack Start guide.
export default defineConfig({
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      // The e2e server never needs the inspector, and two worktrees' runs
      // starting at once could both take 9229 (playwright.config.ts).
      ...(process.env.CLOUDFLARE_ENV === "e2e" && { inspectorPort: false }),
    }),
    tailwindcss(),
    tanstackStart(),
    react(),
    babel({ presets: [reactCompilerPreset(logger ? { logger } : {})] }),
  ],
});
