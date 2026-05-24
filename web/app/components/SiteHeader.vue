<script setup lang="ts">
// SiteHeader component
</script>

<template>
  <header
    class="sticky top-0 z-50 bg-brand-bg border-b border-brand-surface shadow-md"
  >
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <!-- Brand / Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <span
          class="text-2xl font-black tracking-tight text-white group-hover:text-mystic-blue transition-colors duration-300"
        >
          pogo<span class="text-valor-red">.</span>guide
        </span>
      </NuxtLink>

      <!-- Primary Navigation -->
      <nav
        class="hidden md:flex items-center gap-8 text-sm font-bold tracking-wide text-brand-accent"
      >
        <NuxtLink
          to="/guides"
          class="hover:text-mystic-blue transition-colors duration-200"
        >
          Guides
        </NuxtLink>
        <NuxtLink
          to="/resources"
          class="hover:text-instinct-yellow transition-colors duration-200"
        >
          Resources
        </NuxtLink>
      </nav>

      <!-- Utility / Search -->
      <div class="flex items-center gap-4">
        <div class="relative hidden sm:block">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-accent/50"
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
            class="w-72 bg-brand-surface border border-brand-surface/50 rounded-full py-2 pl-10 pr-4 text-xs text-brand-text placeholder-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-mystic-blue transition-all"
          />
        </div>

        <!-- Dark/Light Mode Stub -->
        <button
          class="p-2 rounded-full bg-brand-surface hover:bg-brand-surface/80 text-brand-accent transition-colors"
          aria-label="Toggle Dark Mode"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
