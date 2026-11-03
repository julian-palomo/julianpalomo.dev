import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
  ],
});
