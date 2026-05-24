// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxtjs/tailwindcss",
    "@nuxt/image",
    "@nuxtjs/sanity",
    "@nuxtjs/turnstile",
    "@nuxt/a11y",
    "@nuxtjs/color-mode",
    "@sentry/nuxt/module",
    "@nuxtjs/sitemap",
    "@nuxtjs/robots",
  ],
  colorMode: {
    classSuffix: "",
  },
  turnstile: {
    siteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  },
  css: ["~~/assets/css/tailwind.css"],
  nitro: {
    preset: "cloudflare-pages",
    prerender: {
      autoSubfolderIndex: false,
    },
  },
  image: {
    format: ["avif", "webp"],
  },
  vite: {
    optimizeDeps: {
      include: ["@portabletext/vue", "@sanity/client"],
    },
  },
  runtimeConfig: {
    turnstile: {
      secretKey: process.env.NUXT_TURNSTILE_SECRET_KEY || "",
    },
    sanityWriteToken: process.env.SANITY_WRITE_TOKEN || "",
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
  },
  app: {
    head: {
      link: [{ rel: "icon", type: "image/svg", href: "/favicon.svg" }],
    },
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || "https://pogo.guide",
  },
});
