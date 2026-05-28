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
    include: [
      "tests/server/admin.test.ts",
      "tests/server/deletion-request.test.ts",
      "tests/server/guide-reports.test.ts",
    ],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
