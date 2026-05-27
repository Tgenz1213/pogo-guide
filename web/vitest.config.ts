import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    pool: "@cloudflare/vitest-pool-workers",
    poolOptions: { workers: { wrangler: { configPath: "./wrangler.jsonc" } } },
    globals: true,
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
