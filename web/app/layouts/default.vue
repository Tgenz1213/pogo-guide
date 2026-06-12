<script setup lang="ts"></script>

<template>
  <div
    class="flex flex-col min-h-screen bg-slate-50 dark:bg-brand-bg text-slate-900 dark:text-brand-text font-sans"
  >
    <SiteHeader />
    <main class="grow flex flex-col">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
