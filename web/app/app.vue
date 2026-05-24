<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: "en",
  },
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} - pogo.guide` : "pogo.guide";
  },
});
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
