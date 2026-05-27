import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    web: {
      entry: ["sanity.cli.ts", "tailwind.config.ts", "vitest.server.config.ts"],
      project: ["**/*.{ts,vue}!"],
    },
    studio: {
      entry: ["schemaTypes/**/*.ts!"],
      project: ["**/*.{ts,js}!"],
    },
  },
  ignoreDependencies: [
    "@sanity/vision!",
    "lint-staged",
    "vue-tsc",
    "prettier",
    "nuxt-auth-utils",
    "@cloudflare/vitest-pool-workers",
    "drizzle-kit",
    "h3",
    "cloudflare",
  ],
  ignoreIssues: {
    "web/sanity.cli.ts": ["unlisted"],
    "web/server/api/submit-suggestion.post.ts": ["unlisted"],
    "web/tailwind.config.ts": ["unlisted"],
    "web/types/sanity.d.ts": ["exports", "types"],
    "web/server/db/schema.ts": ["exports"],
  },
};

export default config;
