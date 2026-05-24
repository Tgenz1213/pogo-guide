<script setup lang="ts">
import type { CategoriesQueryResult } from "~~/types/sanity";

// guides/index.vue
const categoriesQuery = groq`*[_type == "category"] {
  _id,
  title,
  "slug": slug.current,
  description
}`;

const { data } = await useSanityQuery<CategoriesQueryResult>(categoriesQuery);
const categories = computed(() => data.value || []);

// Dynamic theme mapping based on index to replicate original styling
const themes = [
  { color: "text-mystic-blue", border: "border-mystic-blue/30" },
  { color: "text-valor-red", border: "border-valor-red/30" },
  { color: "text-instinct-yellow", border: "border-instinct-yellow/30" },
];

const getTheme = (index: number) => {
  return themes[index % themes.length]!;
};
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
      <NuxtLink
        v-for="(cat, idx) in categories"
        :key="cat?._id || idx"
        :to="`/guides/category/${cat?.slug}`"
        class="flex flex-col p-6 rounded-3xl bg-white dark:bg-brand-surface/20 border border-slate-200 dark:border-brand-surface hover:bg-white dark:bg-brand-surface/40 transition-all duration-300 cursor-pointer group"
        :class="`hover:${getTheme(idx).border}`"
      >
        <span
          class="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-slate-50 dark:bg-brand-bg border border-slate-200 dark:border-brand-surface w-max mb-4"
          :class="getTheme(idx).color"
        >
          {{ cat?.title || "Untitled" }}
        </span>
        <h2
          class="text-2xl font-bold text-slate-900 dark:text-brand-text mb-3"
          :class="`group-hover:${getTheme(idx).color}`"
        >
          {{ cat?.title || "Untitled" }}
        </h2>
        <p class="text-slate-500 dark:text-brand-accent leading-relaxed">
          {{ cat?.description || "" }}
        </p>
      </NuxtLink>
    </div>
  </main>
</template>
