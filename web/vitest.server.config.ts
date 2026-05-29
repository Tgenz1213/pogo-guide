import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
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
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: ["sanitize-html"],
        },
      },
    },
  },
});
