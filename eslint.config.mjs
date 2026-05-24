import withNuxt from "./web/.nuxt/eslint.config.mjs";
import prettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";

export default withNuxt(
  {
    ignores: ["studio/**"],
  },
  {
    plugins: {
      prettier,
    },
    rules: {
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      "vue/multi-word-component-names": "off",
      "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    },
  },
  configPrettier,
);
