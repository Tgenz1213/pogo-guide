import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "nitro-cloudflare-dev",
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxtjs/sanity",
    "@nuxtjs/turnstile",
    "@nuxt/a11y",
    "@nuxtjs/color-mode",
    "@sentry/nuxt/module",
    "@nuxtjs/sitemap",
    "@nuxtjs/robots",
    "nuxt-auth-utils",
  ],
  colorMode: {
    classSuffix: "",
  },
  turnstile: {
    siteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  },
  css: ["~~/assets/css/tailwind.css"],
  nitro: {
    preset: "cloudflare_module",

    output: {
      dir: ".cloudflare",
    },

    prerender: {
      autoSubfolderIndex: false,
    },

    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
  robots: {
    groups: [{ userAgent: "*" }],
  },
  image: {
    format: ["avif", "webp"],
  },
  vite: {
    plugins: [...tailwindcss()],
    optimizeDeps: {
      include: ["@portabletext/vue", "@sanity/client"],
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // VueUse ships #__PURE__ annotations in positions Rollup can't interpret — safe to ignore
          if (
            warning.code === "INVALID_ANNOTATION" &&
            warning.id?.includes("@vueuse/core")
          )
            return;
          // nuxt:module-preload-polyfill doesn't emit sourcemaps — safe to ignore
          if (warning.message?.includes("nuxt:module-preload-polyfill")) return;
          warn(warning);
        },
      },
    },
  },
  runtimeConfig: {
    turnstile: {
      secretKey: process.env.NUXT_TURNSTILE_SECRET_KEY || "",
    },
    sanityWriteToken: "", // Will be overridden by NUXT_SANITY_WRITE_TOKEN
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "https://pogo.guide",
      testMode: process.env.TEST_MODE || "",
      e2eMode: process.env.NUXT_PUBLIC_E2E_MODE === "true",
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || "",
    },
  },
  sanity: {
    projectId: "84tfhiiz",
    dataset: "production",
    apiVersion: "2024-05-24",
    useCdn: true,
  },
  typescript: {
    typeCheck: true,
  },
  sentry: {
    sourceMapsUploadOptions: {
      enabled: false, // Enable in production CI with SENTRY_AUTH_TOKEN env var
    },
    enabled: true,
  },
  app: {
    head: {},
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || "https://pogo.guide",
  },
});
