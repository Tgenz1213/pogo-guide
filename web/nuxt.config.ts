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
  runtimeConfig: {
    turnstile: {
      secretKey: process.env.NUXT_TURNSTILE_SECRET_KEY || "",
    },
    sanityWriteToken: process.env.SANITY_WRITE_TOKEN || "",
    public: {
      testMode: process.env.TEST_MODE || "",
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
});
