import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Sequential to prevent database write conflicts
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NUXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      NUXT_TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000000000000",
      NUXT_PUBLIC_E2E_MODE: "true",
      NUXT_PUBLIC_SANITY_DATASET: "test",
    },
  },
});
