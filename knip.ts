import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    web: {
      entry: ["sanity.cli.ts"],
      project: ["**/*.{ts,vue}!"],
    },
    studio: {
      entry: ["schemaTypes/**/*.ts!", "actions/**/*.ts!"],
      project: ["**/*.{ts,js}!"],
    },
  },
  ignoreDependencies: [
    "@sanity/vision!",
    "lint-staged",
    "vue-tsc",
    "prettier",
    "cloudflare",
  ],
  ignoreIssues: {
    "web/sanity.cli.ts": ["unlisted"],
    "web/server/api/submit-suggestion.post.ts": ["unlisted"],
    "web/tailwind.config.ts": ["unlisted"],
    "web/shared/types/sanity.d.ts": ["exports", "types"],
    "web/shared/types/auth.d.ts": ["files"],
    "web/tests/nuxt-test-globals.d.ts": ["files"],
    "web/worker-configuration.d.ts": ["files"],
    "web/server/db/schema.ts": ["exports"],
  },
};

export default config;
