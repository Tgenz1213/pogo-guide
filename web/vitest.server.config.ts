import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "sanitize-html": fileURLToPath(
        new URL("./tests/server/mocks/sanitize-html.ts", import.meta.url),
      ),
    },
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.test.jsonc" },
    }),
  ],
  test: {
    name: "server",
    globals: true,
    include: ["tests/server/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
