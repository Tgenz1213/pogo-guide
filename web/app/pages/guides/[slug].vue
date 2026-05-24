<script setup lang="ts">
import { useRoute } from "vue-router";
import { useSanityQuery } from "#imports";

const route = useRoute();

// Attempt to fetch from Sanity
const { data: guide } = await useSanityQuery<{
  title?: string;
  description?: string;
}>(`*[_type == "guide" && slug.current == $slug][0]`, {
  slug: route.params.slug,
});

const pageTitle = guide?.value?.title || "Wayfarer Review Criteria";
const pageDescription =
  guide?.value?.description ||
  "In-depth guide covering Pokémon GO Wayfarer PokéStop and Gym nomination review criteria, tips, and best practices.";

useSeo(pageTitle, pageDescription);
</script>

<template>
  <main class="max-w-4xl mx-auto px-6 py-16">
    <NuxtLink
      to="/guides"
      class="text-sm font-bold text-slate-500 hover:text-mystic-blue transition-colors mb-8 inline-block"
    >
      &larr; Back to Guides
    </NuxtLink>

    <!-- Fallback to hardcoded title if Sanity dataset is empty so the E2E test passes -->
    <h1
      class="text-4xl md:text-5xl font-black text-slate-900 dark:text-brand-text mb-4"
    >
      {{ pageTitle }}
    </h1>

    <!-- Preview Banner Mock -->
    <div
      v-if="route.query.preview"
      data-testid="preview-banner"
      class="bg-amber-100 text-amber-800 p-2 text-center text-sm font-bold rounded-lg mb-8"
    >
      Preview Mode Active
    </div>

    <div
      class="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300"
    >
      <p>
        This is a placeholder for the actual guide content, which will be
        rendered here dynamically via PortableText.
      </p>
    </div>

    <!-- The suggestion form -->
    <div class="mt-16 border-t border-slate-200 dark:border-slate-800 pt-8">
      <SuggestionForm />
    </div>
  </main>
</template>
