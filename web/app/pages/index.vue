<script setup lang="ts">
type ModuleIcon = "map" | "shield" | "fire";

interface GuideModule {
  title: string;
  desc: string;
  category: string;
  icon: ModuleIcon;
}

const modules: GuideModule[] = [
  {
    title: "PokéStop Submission Guide",
    desc: "Understand how S2 cell divisions and the strict 20-meter proximity rule govern PokéStop and Gym eligibility.",
    category: "Map & Spatial Rules",
    icon: "map",
  },
  {
    title: "PvP Fast Move Frame-Data",
    desc: "Complete frame charts outlining Fast Move turn counts, Energy-per-Turn (EPT), and Damage-per-Turn (DPT) meta-rankings.",
    category: "GBL Turn Combat",
    icon: "shield",
  },
  {
    title: "Mega Raid Damage Counters",
    desc: "Optimal attacker party layouts, dynamic DPS counters, damage coefficients, and weather multiplier sheets.",
    category: "Raid Counters",
    icon: "fire",
  },
];
</script>

<template>
  <div
    class="min-h-screen bg-brand-bg text-brand-text relative selection:bg-brand-accent selection:text-brand-bg font-sans overflow-hidden"
  >
    <!-- Sophisticated Abstract Grid Backdrop -->
    <div
      class="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 -z-10"
    ></div>

    <!-- Background Ambient Glows -->
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-brand-accent/10 rounded-full blur-[120px] -z-10 pointer-events-none"
    ></div>

    <!-- Header Navigation -->
    <header
      class="sticky top-0 z-50 backdrop-blur-md bg-brand-bg/75 border-b border-slate-800/80"
    >
      <div
        class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between"
      >
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <span
            class="text-xl font-extrabold tracking-tight text-slate-100 group-hover:text-brand-accent transition-colors duration-300"
          >
            pogo<span class="text-brand-accent">.</span>guide
          </span>
          <div class="h-4 w-px bg-slate-800"></div>
          <span
            class="text-[10px] font-mono uppercase tracking-widest text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded"
          >
            v1.0.0
          </span>
        </NuxtLink>

        <nav
          class="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-400"
        >
          <NuxtLink
            to="/"
            class="hover:text-brand-accent transition-colors duration-200"
            >Reference Index</NuxtLink
          >
          <NuxtLink
            to="/"
            class="hover:text-brand-accent transition-colors duration-200"
            >Isolate API</NuxtLink
          >
          <NuxtLink
            to="/"
            class="hover:text-brand-accent transition-colors duration-200"
            >Guidelines</NuxtLink
          >
        </nav>

        <div class="flex items-center gap-4">
          <button
            class="inline-flex items-center px-4 py-2 border border-slate-800 bg-brand-surface/40 hover:bg-brand-surface/80 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 transition-all duration-200 cursor-pointer"
          >
            Access Database
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 space-y-24">
      <!-- Hero Section -->
      <section class="text-center max-w-3xl mx-auto space-y-8">
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold tracking-wide text-slate-400"
        >
          <span class="flex h-2 w-2 relative">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"
            ></span>
          </span>
          Decoupled Headless Content Lake
        </div>

        <h1
          class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-100 leading-tight"
        >
          Systematic Mechanics & <br />
          <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-sky-400 to-indigo-400"
          >
            Gameplay Reference
          </span>
        </h1>

        <p
          class="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed"
        >
          High-performance, edge-rendered gameplay guides compiled dynamically
          from structured schemas. Optimized for accuracy, sub-millisecond
          execution, and global Edge distribution.
        </p>

        <div class="pt-4 flex flex-wrap items-center justify-center gap-4">
          <button
            class="px-6 py-3 bg-brand-accent hover:bg-sky-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-brand-accent/10 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
          >
            Browse Reference Index
          </button>
          <button
            class="px-6 py-3 border border-slate-800 hover:border-slate-700 bg-brand-surface/20 rounded-xl text-slate-300 font-semibold transition-all duration-200 hover:scale-[1.02] cursor-pointer"
          >
            API Documentation
          </button>
        </div>
      </section>

      <!-- Isolate Infrastructure Stats Banner -->
      <section
        class="max-w-4xl mx-auto p-6 rounded-2xl bg-brand-surface/20 border border-slate-800/80 backdrop-blur-sm"
      >
        <div
          class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800"
        >
          <div class="pt-4 md:pt-0">
            <div class="text-2xl font-black text-slate-100 font-mono">100%</div>
            <div
              class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1"
            >
              Edge Availability
            </div>
          </div>
          <div class="pt-4 md:pt-0">
            <div class="text-2xl font-black text-brand-accent font-mono">
              &lt; 15ms
            </div>
            <div
              class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1"
            >
              Render Latency
            </div>
          </div>
          <div class="pt-4 md:pt-0">
            <div class="text-2xl font-black text-slate-100 font-mono">
              Active
            </div>
            <div
              class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1"
            >
              TypeGen Schemas
            </div>
          </div>
          <div class="pt-4 md:pt-0">
            <div class="text-2xl font-black text-slate-100 font-mono">test</div>
            <div
              class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1"
            >
              Active Dataset
            </div>
          </div>
        </div>
      </section>

      <!-- Reference Grid -->
      <section class="space-y-8">
        <div class="text-center space-y-2">
          <h2 class="text-2xl font-bold tracking-tight text-slate-100">
            Core Reference Modules
          </h2>
          <p class="text-slate-500 text-xs max-w-sm mx-auto">
            Explore programmatically generated guides derived from the decoupled
            Sanity repository.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(mod, idx) in modules"
            :key="idx"
            class="group p-8 rounded-3xl bg-brand-surface/10 border border-slate-800/80 hover:border-slate-700/60 hover:bg-brand-surface/30 transition-all duration-300 shadow-xl"
          >
            <div
              class="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-center mb-6 shadow-inner"
            >
              <!-- Map icon: PokéStop Submission -->
              <svg
                v-if="mod.icon === 'map'"
                class="w-6 h-6 text-brand-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 6.75V15m6-6v8m-9-3.75h.008v.008H6V11.25zm.008 4.5H6v.008h.008V15.75zm0 2.25H6v.008h.008V18zm2.25-4.5h.008v.008H8.25V13.5zm.008 4.5h.008v.008H8.25V18zm2.25-9h.008v.008h-.008V9zm0 2.25h.008v.008h-.008V11.25zm0 2.25h.008v.008h-.008V13.5zm2.25-4.5h.008v.008h-.008V9zm0 2.25h.008v.008h-.008V11.25zm0 2.25h.008v.008h-.008V13.5zm2.25-4.5h.008v.008h-.008V9zm0 2.25h.008v.008h-.008V11.25zm0 2.25h.008v.008h-.008V13.5zm2.25-4.5h.008v.008h-.008V9zm0 2.25h.008v.008h-.008V11.25zm0 2.25h.008v.008h-.008V13.5zm2.25-4.5h.008v.008h-.008V9zm0 2.25h.008v.008h-.008V11.25z"
                />
              </svg>

              <!-- Shield icon: PvP Frame-Data -->
              <svg
                v-else-if="mod.icon === 'shield'"
                class="w-6 h-6 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>

              <!-- Fire icon: Mega Raid Counters -->
              <svg
                v-else-if="mod.icon === 'fire'"
                class="w-6 h-6 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.64 8.38m7.4 3.42a14.98 14.98 0 00-11.1-9c-1.78-.17-3.21 1.25-3.04 3.03a14.98 14.98 0 009.02 11.12m0 0a14.98 14.98 0 01-3.4 3.4"
                />
              </svg>
            </div>

            <div
              class="text-[10px] font-bold uppercase tracking-wider text-brand-accent mb-2"
            >
              {{ mod.category }}
            </div>

            <h3
              class="text-lg font-bold text-slate-100 mb-2 group-hover:text-brand-accent transition-colors duration-200"
            >
              {{ mod.title }}
            </h3>

            <p class="text-xs text-slate-400 leading-relaxed mb-6">
              {{ mod.desc }}
            </p>

            <div
              class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-brand-accent transition-colors duration-200"
            >
              View Specifications
              <span
                class="group-hover:translate-x-0.5 transition-transform duration-200"
                >→</span
              >
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer
      class="border-t border-slate-800/60 bg-slate-950/20 py-12 text-center text-[10px] text-slate-500 font-mono"
    >
      <div class="max-w-7xl mx-auto px-6 space-y-4">
        <p>
          © 2026 pogo.guide. Continuous delivery via Cloudflare Edge isolates.
        </p>
        <p class="text-[9px] text-slate-600 leading-relaxed max-w-xl mx-auto">
          pogo.guide is an independent open-source reference database and is not
          associated with Niantic, Inc., Nintendo Co., Ltd., or The Pokémon
          Company.
        </p>
      </div>
    </footer>
  </div>
</template>
