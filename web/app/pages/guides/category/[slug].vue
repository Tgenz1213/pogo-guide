<script setup lang="ts">
import { useRoute } from "vue-router";
import type { CategoryGuidesQueryResult } from "~~/types/sanity";

// guides/category/[slug].vue
const route = useRoute();

const categoryGuidesQuery = groq`*[_type == "category" && slug.current == $slug][0] {
  _id,
  title,
  description,
  "guides": *[_type == "guide" && isHiddenByModeration != true && references(^._id)] {
    _id,
    title,
    "slug": slug.current
  }
}`;

const { data } = await useSanityQuery<CategoryGuidesQueryResult>(
  categoryGuidesQuery,
  {
    slug: route.params.slug,
  },
);

const category = computed(() => data.value);

useSeo(
  category.value?.title || "Category",
  category.value?.description || "Browse guides for this category",
);
</script>

<template>
  <main class="max-w-7xl mx-auto px-6 py-16">
    <NuxtLink
      to="/guides"
      class="text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-mystic-blue transition-colors mb-8 inline-block"
    >
      &larr; Back to Guides
    </NuxtLink>

    <div v-if="category" class="mb-12">
      <h1
        class="text-4xl md:text-5xl font-black text-slate-900 dark:text-brand-text tracking-tight mb-4"
      >
        {{ category.title || "Category" }}
      </h1>
      <p class="text-slate-500 dark:text-brand-accent text-lg max-w-2xl">
        {{ category.description || "Guides for this category." }}
      </p>
    </div>

    <!-- Guides List -->
    <div
      v-if="category?.guides?.length"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
    >
      <NuxtLink
        v-for="guide in category.guides"
        :key="guide._id"
        :to="`/guides/${guide.slug}`"
        class="flex flex-col p-6 rounded-3xl bg-white dark:bg-brand-surface/20 border border-slate-200 dark:border-brand-surface hover:bg-white dark:bg-brand-surface/40 hover:border-mystic-blue/30 transition-all duration-300 cursor-pointer group"
      >
        <h2
          class="text-xl font-bold text-slate-900 dark:text-brand-text mb-3 group-hover:text-mystic-blue"
        >
          {{ guide.title || "Untitled Guide" }}
        </h2>
        <span class="text-mystic-blue text-sm font-bold mt-auto">
          Read Guide &rarr;
        </span>
      </NuxtLink>
    </div>

    <div
      v-else-if="category"
      class="text-slate-500 dark:text-brand-accent mt-8 p-6 bg-slate-50 dark:bg-brand-surface/20 rounded-3xl border border-slate-200 dark:border-brand-surface"
    >
      No guides have been published in this category yet.
    </div>

    <div v-else class="text-slate-500">Category not found.</div>
  </main>
</template>
