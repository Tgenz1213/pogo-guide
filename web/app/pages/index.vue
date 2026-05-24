<script setup lang="ts">
// index.vue
const recentUpdates = [
  {
    title: "GBL Season 18 Rebalance Analysis",
    date: "2 days ago",
    category: "PvP",
    desc: "Complete breakdown of the new Scald debuffs and its impact on the Great League meta.",
  },
  {
    title: "Shadow Mewtwo Raid Weekend Prep",
    date: "5 days ago",
    category: "Event",
    desc: "Optimal counters, duo requirements, and breakpoints for the upcoming Shadow Mewtwo raids.",
  },
  {
    title: "S2 Cell Update: Showcase Stops",
    date: "1 week ago",
    category: "Map Rules",
    desc: "New findings on how Niantic selects which PokéStops become Showcase eligible based on Level 13 cells.",
  },
];
</script>

<template>
  <main class="w-full">
    <!-- Hero Section -->
    <section class="max-w-7xl mx-auto px-6 py-16 md:py-24 space-y-10">
      <div class="max-w-3xl space-y-6">
        <h1
          class="text-5xl md:text-7xl font-black tracking-tight text-white leading-tight"
        >
          Master the Meta.<br />
          <span class="text-mystic-blue">Dominate Your Raids.</span>
        </h1>

        <p
          class="text-lg md:text-xl text-brand-accent max-w-2xl leading-relaxed font-medium"
        >
          Accurate frame data, dynamic raid counters, and up-to-date guides for
          Pokémon GO.
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
            placeholder="Search for a Pokémon, Move, or Event..."
            class="w-full bg-white border-2 border-transparent focus:border-mystic-blue rounded-2xl py-4 pl-14 pr-6 text-brand-bg placeholder-brand-surface font-semibold text-lg shadow-xl focus:outline-none transition-all"
          />
        </div>
      </div>
    </section>

    <!-- Current State Dashboard -->
    <section class="bg-brand-surface/30 border-y border-brand-surface">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <div class="flex items-center gap-2 mb-6">
          <div class="w-2 h-2 rounded-full bg-valor-red animate-pulse"></div>
          <h2
            class="text-sm font-bold uppercase tracking-widest text-brand-accent"
          >
            Current State
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Raid Boss -->
          <div
            class="p-6 rounded-2xl bg-brand-bg border border-brand-surface flex items-start gap-4 shadow-lg"
          >
            <div
              class="w-12 h-12 rounded-full bg-mystic-blue/20 flex items-center justify-center shrink-0 border border-mystic-blue/30"
            >
              <span class="text-mystic-blue font-bold text-xl">5★</span>
            </div>
            <div>
              <div
                class="text-xs font-bold uppercase tracking-wider text-mystic-blue mb-1"
              >
                Legendary Raid
              </div>
              <h3 class="text-lg font-black text-white">Origin Forme Dialga</h3>
              <NuxtLink
                to="/guides"
                class="text-xs text-brand-accent hover:text-white underline mt-2 inline-block"
                >View Counters →</NuxtLink
              >
            </div>
          </div>

          <!-- Mega Boss -->
          <div
            class="p-6 rounded-2xl bg-brand-bg border border-brand-surface flex items-start gap-4 shadow-lg"
          >
            <div
              class="w-12 h-12 rounded-full bg-valor-red/20 flex items-center justify-center shrink-0 border border-valor-red/30"
            >
              <span class="text-valor-red font-bold text-xl">M</span>
            </div>
            <div>
              <div
                class="text-xs font-bold uppercase tracking-wider text-valor-red mb-1"
              >
                Mega Raid
              </div>
              <h3 class="text-lg font-black text-white">Mega Garchomp</h3>
              <NuxtLink
                to="/guides"
                class="text-xs text-brand-accent hover:text-white underline mt-2 inline-block"
                >View Counters →</NuxtLink
              >
            </div>
          </div>

          <!-- GBL League -->
          <div
            class="p-6 rounded-2xl bg-brand-bg border border-brand-surface flex items-start gap-4 shadow-lg"
          >
            <div
              class="w-12 h-12 rounded-full bg-instinct-yellow/20 flex items-center justify-center shrink-0 border border-instinct-yellow/30"
            >
              <span class="text-instinct-yellow font-bold text-xl">⚔️</span>
            </div>
            <div>
              <div
                class="text-xs font-bold uppercase tracking-wider text-instinct-yellow mb-1"
              >
                Active League
              </div>
              <h3 class="text-lg font-black text-white">
                Great League & Sunshine Cup
              </h3>
              <NuxtLink
                to="/resources"
                class="text-xs text-brand-accent hover:text-white underline mt-2 inline-block"
                >View Frame Data →</NuxtLink
              >
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Updates -->
    <section class="max-w-7xl mx-auto px-6 py-20 space-y-8">
      <h2 class="text-2xl font-black text-white">Recent Updates</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <article
          v-for="(update, idx) in recentUpdates"
          :key="idx"
          class="group block p-6 rounded-3xl bg-brand-surface/10 border border-brand-surface hover:border-mystic-blue/50 hover:bg-brand-surface/30 transition-all duration-300 cursor-pointer"
        >
          <div class="flex items-center gap-3 mb-4">
            <span
              class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-brand-bg border border-brand-surface text-brand-accent group-hover:border-mystic-blue/30 group-hover:text-mystic-blue transition-colors"
            >
              {{ update.category }}
            </span>
            <span class="text-xs font-semibold text-brand-surface">{{
              update.date
            }}</span>
          </div>

          <h3
            class="text-xl font-bold text-white mb-3 group-hover:text-mystic-blue transition-colors"
          >
            {{ update.title }}
          </h3>

          <p class="text-sm text-brand-accent leading-relaxed">
            {{ update.desc }}
          </p>
        </article>
      </div>
    </section>
  </main>
</template>
