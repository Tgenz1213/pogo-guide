<script setup lang="ts">
import faviconUrl from "~/assets/favicon.svg?url";

useHead({
  htmlAttrs: {
    lang: "en",
  },
  link: [{ rel: "icon", type: "image/svg+xml", href: faviconUrl }],
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - pogo.guide` : "pogo.guide";
  },
});

// App-wide fallback SEO — overridden per-page by individual useSeo() calls
useSeo(
  "pogo.guide",
  "The ultimate edge-rendered, open-source guide database for Pokémon GO PvE, PvP, inventory management, and Wayfarer review criteria.",
);
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 dark:bg-brand-bg text-slate-900 dark:text-brand-text font-sans"
  >
    <SiteHeader />
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
