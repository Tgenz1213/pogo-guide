import type { KnipConfig } from "knip";

const config: KnipConfig = {
  workspaces: {
    web: {
      entry: ["sanity.cli.ts", "tailwind.config.ts", "nuxt.config.ts!"],
      project: ["**/*.{ts,vue}!"],
    },
    studio: {
      entry: ["sanity.config.ts!", "schemaTypes/**/*.ts!"],
      project: ["**/*.{ts,js}!"],
    },
  },
  ignoreDependencies: ["@sanity/vision!", "lint-staged", "vue-tsc", "prettier"],
  ignoreIssues: {
    "web/sanity.cli.ts": ["unlisted"],
    "web/server/api/submit-suggestion.post.ts": ["unlisted"],
    "web/tailwind.config.ts": ["unlisted"],
    "web/types/sanity.d.ts": ["exports", "types"],
  },
};

export default config;
