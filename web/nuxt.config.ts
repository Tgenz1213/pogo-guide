// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/eslint", "@nuxtjs/tailwindcss", "@nuxt/image"],
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
  typescript: {
    typeCheck: true,
  },
});
