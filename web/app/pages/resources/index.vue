<script setup lang="ts">
// resources/index.vue
const resourcesQuery = groq`*[_type == "resource"] {
  _id,
  name,
  description,
  url
}`;

interface Resource {
  _id: string;
  name: string;
  description: string;
  url: string;
}

const { data } = await useSanityQuery<Resource[]>(resourcesQuery);
const externalResources = computed(() => data.value || []);
</script>

<template>
  <main class="max-w-7xl mx-auto px-6 py-12 md:py-16">
    <div class="mb-10">
      <h1
        class="text-4xl md:text-5xl font-black text-slate-900 dark:text-brand-text tracking-tight mb-4"
      >
        Resources
      </h1>
      <p class="text-slate-500 dark:text-brand-accent text-lg max-w-2xl">
        A curated directory of the best external tools and community resources.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Main Content Area: Resource Directory -->
      <a
        v-for="resource in externalResources"
        :key="resource.name"
        :href="resource.url"
        target="_blank"
        rel="noopener noreferrer"
        class="group block bg-white dark:bg-brand-surface/20 border border-slate-200 dark:border-brand-surface rounded-2xl p-6 hover:bg-white hover:border-mystic-blue/50 transition-all duration-300"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2
              class="text-xl font-bold text-slate-900 dark:text-brand-text mb-2 group-hover:text-mystic-blue transition-colors flex items-center gap-2"
            >
              {{ resource.name }}
              <svg
                class="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </h2>
            <p class="text-slate-500 dark:text-brand-accent">
              {{ resource.description }}
            </p>
          </div>
        </div>
      </a>
    </div>
  </main>
</template>
