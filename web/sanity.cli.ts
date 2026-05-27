import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: "84tfhiiz",
    dataset: "production",
  },
  typegen: {
    path: "./**/*.{vue,ts}",
    schema: "../studio/schema.json",
    generates: "./shared/types/sanity.d.ts",
  },
});
