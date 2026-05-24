<script setup lang="ts">
// guides/index.vue
const guideCategories = [
  {
    title: "Getting Started",
    tag: "Basics",
    desc: "Learn basic app navigation, menus, settings, and UI walkthroughs.",
    color: "text-mystic-blue",
    border: "border-mystic-blue/30",
  },
  {
    title: "Gameplay Mechanics",
    tag: "Mechanics",
    desc: "How to tell if a Pokémon is good, IVs, levels, and catching techniques.",
    color: "text-valor-red",
    border: "border-valor-red/30",
  },
  {
    title: "Wayfarer & World",
    tag: "Wayfarer",
    desc: "How to submit a good PokéStop, S2 cells, and gym creation rules.",
    color: "text-instinct-yellow",
    border: "border-instinct-yellow/30",
  },
];
</script>

<template>
  <main class="max-w-7xl mx-auto px-6 py-16">
    <div class="mb-12">
      <h1
        class="text-4xl md:text-5xl font-black text-slate-900 dark:text-brand-text tracking-tight mb-4"
      >
        Guides
      </h1>
      <p class="text-slate-500 dark:text-brand-accent text-lg max-w-2xl">
        Foundational how-tos and mechanic deep-dives to help you master Pokémon
        GO.
      </p>
    </div>

    <!-- Grid Layout -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <article
        v-for="(cat, idx) in guideCategories"
        :key="idx"
        class="flex flex-col p-6 rounded-3xl bg-white dark:bg-brand-surface/20 border border-slate-200 dark:border-brand-surface hover:bg-white dark:bg-brand-surface/40 transition-all duration-300 cursor-pointer"
        :class="`hover:${cat.border}`"
      >
        <span
          class="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-slate-50 dark:bg-brand-bg border border-slate-200 dark:border-brand-surface w-max mb-4"
          :class="cat.color"
        >
          {{ cat.tag }}
        </span>
        <h2
          class="text-2xl font-bold text-slate-900 dark:text-brand-text mb-3"
          :class="`group-hover:${cat.color}`"
        >
          {{ cat.title }}
        </h2>
        <p class="text-slate-500 dark:text-brand-accent leading-relaxed">
          {{ cat.desc }}
        </p>
      </article>
    </div>
  </main>
</template>
