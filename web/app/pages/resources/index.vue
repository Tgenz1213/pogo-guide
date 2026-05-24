<script setup lang="ts">
// resources/index.vue
const sideMenu = [
  { name: "News & Events", active: true },
  { name: "PvP & Meta", active: false },
  { name: "Maps & Data", active: false },
];

const externalResources = [
  {
    name: "LeekDuck",
    desc: "The gold standard for event infographics, research tasks, and current raid boss lists.",
    url: "https://leekduck.com",
  },
  {
    name: "Pokémon GO Calendar",
    desc: "A constantly updated Google Calendar to track all ongoing and upcoming events.",
    url: "https://pokemongolive.com",
  },
  {
    name: "PvPoke",
    desc: "The ultimate battle simulator and ranking database for all GO Battle League formats.",
    url: "https://pvpoke.com",
  },
  {
    name: "Campfire App",
    desc: "Niantic's official social app to find local raid groups and communicate with players.",
    url: "https://campfire.nianticlabs.com",
  },
];
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

    <div class="flex flex-col md:flex-row gap-10">
      <!-- Sidebar Menu -->
      <aside class="w-full md:w-64 shrink-0">
        <nav class="flex flex-col space-y-2">
          <button
            v-for="item in sideMenu"
            :key="item.name"
            class="text-left px-4 py-3 rounded-xl font-semibold transition-all duration-200"
            :class="
              item.active
                ? 'bg-mystic-blue text-slate-900 dark:text-brand-text shadow-md'
                : 'text-slate-500 dark:text-brand-accent hover:bg-white dark:bg-brand-surface/50 hover:text-slate-900 dark:text-brand-text'
            "
          >
            {{ item.name }}
          </button>
        </nav>
      </aside>

      <!-- Main Content Area: Resource Directory -->
      <section class="flex-1 space-y-6">
        <a
          v-for="resource in externalResources"
          :key="resource.name"
          :href="resource.url"
          target="_blank"
          rel="noopener noreferrer"
          class="group block bg-white dark:bg-brand-surface/20 border border-slate-200 dark:border-brand-surface rounded-2xl p-6 hover:bg-white dark:bg-brand-surface/40 hover:border-mystic-blue/50 transition-all duration-300"
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
                {{ resource.desc }}
              </p>
            </div>
          </div>
        </a>
      </section>
    </div>
  </main>
</template>
