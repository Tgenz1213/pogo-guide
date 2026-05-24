<script setup lang="ts">
// index.vue
const recentUpdates = [
  {
    title: "Understanding IVs & PvP Ranks",
    date: "2 days ago",
    category: "Mechanics",
    desc: "A beginner's guide to how IVs work and why 0/15/15 is often the best spread for Great League.",
  },
  {
    title: "How to Submit a 5-Star PokéStop",
    date: "5 days ago",
    category: "Wayfarer",
    desc: "Tips on framing your photos, writing good descriptions, and avoiding common rejection reasons.",
  },
  {
    title: "Navigating the Campfire App",
    date: "1 week ago",
    category: "Community",
    desc: "Learn how to find local communities, coordinate raids, and light flares using Campfire.",
  },
];
</script>

<template>
  <main class="w-full">
    <!-- Hero Section -->
    <section
      class="max-w-7xl mx-auto px-6 min-h-[calc(100vh-4rem)] flex flex-col justify-center py-16 md:py-24 space-y-10"
    >
      <div class="max-w-3xl space-y-6">
        <h1
          class="text-5xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-brand-text leading-tight"
        >
          Your Complete Pokémon GO<br />
          <span class="text-mystic-blue">Knowledge Base.</span>
        </h1>

        <p
          class="text-lg md:text-xl text-slate-500 dark:text-brand-accent max-w-2xl leading-relaxed font-medium"
        >
          Learn how to evaluate Pokémon, submit PokéStops, and navigate the game
          with our beginner-friendly guides.
        </p>

        <!-- Search CTA -->
        <div class="relative max-w-xl mt-8">
          <svg
            class="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-brand-surface"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search for a guide or resource..."
            class="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-mystic-blue rounded-2xl py-4 pl-14 pr-6 text-brand-bg placeholder-brand-surface font-semibold text-lg shadow-xl focus:outline-none transition-all"
          />
        </div>
      </div>
    </section>

    <!-- Featured Guides Dashboard -->
    <section
      class="bg-white dark:bg-brand-surface/30 border-y border-slate-200 dark:border-brand-surface"
    >
      <div class="max-w-7xl mx-auto px-6 py-8">
        <div class="flex items-center gap-2 mb-6">
          <div
            class="w-2 h-2 rounded-full bg-instinct-yellow animate-pulse"
          ></div>
          <h2
            class="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-brand-accent"
          >
            Featured Guides
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Guide 1 -->
          <div
            class="p-6 rounded-2xl bg-slate-50 dark:bg-brand-bg border border-slate-200 dark:border-brand-surface flex items-start gap-4 shadow-lg group hover:border-mystic-blue transition-colors cursor-pointer"
          >
            <div
              class="w-12 h-12 rounded-full bg-mystic-blue/20 flex items-center justify-center shrink-0 border border-mystic-blue/30 text-mystic-blue"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <div>
              <div
                class="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-mystic-blue mb-1"
              >
                Getting Started
              </div>
              <h3
                class="text-lg font-black text-slate-900 dark:text-brand-text group-hover:text-mystic-blue transition-colors"
              >
                App Navigation
              </h3>
              <p class="text-sm text-slate-500 dark:text-brand-accent mt-2">
                Learn the UI basics, menus, and hidden features.
              </p>
            </div>
          </div>

          <!-- Guide 2 -->
          <div
            class="p-6 rounded-2xl bg-slate-50 dark:bg-brand-bg border border-slate-200 dark:border-brand-surface flex items-start gap-4 shadow-lg group hover:border-valor-red transition-colors cursor-pointer"
          >
            <div
              class="w-12 h-12 rounded-full bg-valor-red/20 flex items-center justify-center shrink-0 border border-valor-red/30 text-valor-red"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <div
                class="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-valor-red mb-1"
              >
                Mechanics
              </div>
              <h3
                class="text-lg font-black text-slate-900 dark:text-brand-text group-hover:text-valor-red transition-colors"
              >
                Evaluating Pokémon
              </h3>
              <p class="text-sm text-slate-500 dark:text-brand-accent mt-2">
                Understand IVs, levels, and appraisals.
              </p>
            </div>
          </div>

          <!-- Guide 3 -->
          <div
            class="p-6 rounded-2xl bg-slate-50 dark:bg-brand-bg border border-slate-200 dark:border-brand-surface flex items-start gap-4 shadow-lg group hover:border-instinct-yellow transition-colors cursor-pointer"
          >
            <div
              class="w-12 h-12 rounded-full bg-instinct-yellow/20 flex items-center justify-center shrink-0 border border-instinct-yellow/30 text-instinct-yellow"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <div
                class="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-instinct-yellow mb-1"
              >
                Wayfarer
              </div>
              <h3
                class="text-lg font-black text-slate-900 dark:text-brand-text group-hover:text-instinct-yellow transition-colors"
              >
                PokéStop Submissions
              </h3>
              <p class="text-sm text-slate-500 dark:text-brand-accent mt-2">
                Create great nominations that get approved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Updates -->
    <section class="max-w-7xl mx-auto px-6 py-20 space-y-8">
      <h2 class="text-2xl font-black text-slate-900 dark:text-brand-text">
        Recent Updates
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <article
          v-for="(update, idx) in recentUpdates"
          :key="idx"
          class="group block p-6 rounded-3xl bg-white dark:bg-brand-surface/10 border border-slate-200 dark:border-brand-surface hover:border-mystic-blue/50 hover:bg-white dark:bg-brand-surface/30 transition-all duration-300 cursor-pointer"
        >
          <div class="flex items-center gap-3 mb-4">
            <span
              class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-50 dark:bg-brand-bg border border-slate-200 dark:border-brand-surface text-slate-500 dark:text-brand-accent group-hover:border-mystic-blue/30 group-hover:text-mystic-blue transition-colors"
            >
              {{ update.category }}
            </span>
            <span class="text-xs font-semibold text-brand-surface">{{
              update.date
            }}</span>
          </div>

          <h3
            class="text-xl font-bold text-slate-900 dark:text-brand-text mb-3 group-hover:text-mystic-blue transition-colors"
          >
            {{ update.title }}
          </h3>

          <p
            class="text-sm text-slate-500 dark:text-brand-accent leading-relaxed"
          >
            {{ update.desc }}
          </p>
        </article>
      </div>
    </section>
  </main>
</template>
