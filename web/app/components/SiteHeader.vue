<script setup lang="ts">
import { ref, computed } from "vue";
import SearchAutocomplete from "./SearchAutocomplete.vue";

const isMenuOpen = ref(false);
const colorMode = useColorMode();

const toggleDarkMode = () => {
  colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
};

const isDark = computed(() => colorMode.value === "dark");
const closeMenu = () => {
  isMenuOpen.value = false;
};
</script>

<template>
  <header
    class="sticky top-0 z-50 bg-brand-lightSurface dark:bg-brand-bg shadow-sm shadow-slate-200/50 dark:shadow-none border-b border-brand-lightBorder dark:border-brand-surface"
  >
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <!-- Mobile Menu Toggle -->
        <button
          class="md:hidden p-2 rounded-md text-slate-500 dark:text-brand-accent hover:bg-white dark:bg-brand-surface transition-colors focus:outline-none"
          aria-label="Toggle Menu"
          :aria-expanded="isMenuOpen"
          @click="isMenuOpen = !isMenuOpen"
        >
          <svg
            v-if="!isMenuOpen"
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            v-else
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <!-- Brand / Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <span
            class="text-2xl font-black tracking-tight text-slate-900 dark:text-brand-text group-hover:text-mystic-blue transition-colors duration-300"
          >
            pogo<span class="text-valor-red">.</span>guide
          </span>
        </NuxtLink>
      </div>

      <!-- Primary Navigation (Desktop) -->
      <nav
        aria-label="Primary"
        class="hidden md:flex items-center gap-8 text-sm font-bold tracking-wide text-slate-500 dark:text-brand-accent"
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
        <SearchAutocomplete variant="header" />

        <!-- Dark/Light Mode (Desktop) -->
        <button
          class="hidden md:block p-2 rounded-full bg-white dark:bg-brand-surface hover:bg-white dark:bg-brand-surface/80 text-slate-500 dark:text-brand-accent transition-colors"
          aria-label="Toggle Dark Mode"
          @click="toggleDarkMode"
        >
          <ClientOnly>
            <svg
              v-if="!isDark"
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
            <svg
              v-else
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <template #fallback>
              <div class="w-5 h-5"></div>
            </template>
          </ClientOnly>
        </button>
      </div>
    </div>

    <!-- Mobile Menu Overlay -->
    <div
      v-if="isMenuOpen"
      class="md:hidden fixed inset-0 top-16 z-40"
      @click="closeMenu"
    >
      <div class="absolute inset-0 bg-slate-900/25 dark:bg-black/35" />

      <div
        class="relative bg-slate-50 dark:bg-brand-bg border-t border-slate-200 dark:border-brand-surface px-6 py-4 space-y-4 shadow-lg"
        @click.stop
      >
        <nav
          aria-label="Mobile"
          class="flex flex-col gap-4 text-sm font-bold tracking-wide text-slate-500 dark:text-brand-accent"
        >
          <NuxtLink
            to="/guides"
            class="hover:text-mystic-blue transition-colors duration-200 block py-2 border-b border-slate-200 dark:border-brand-surface"
            @click="closeMenu"
          >
            Guides
          </NuxtLink>
          <NuxtLink
            to="/resources"
            class="hover:text-instinct-yellow transition-colors duration-200 block py-2 border-b border-slate-200 dark:border-brand-surface"
            @click="closeMenu"
          >
            Resources
          </NuxtLink>
        </nav>
        <div class="pt-2">
          <button
            class="flex items-center gap-3 p-2 w-full rounded-md bg-white dark:bg-brand-surface hover:bg-white dark:bg-brand-surface/80 text-slate-500 dark:text-brand-accent transition-colors"
            aria-label="Toggle Dark Mode"
            @click="toggleDarkMode"
          >
            <ClientOnly>
              <div class="flex items-center gap-3">
                <svg
                  v-if="!isDark"
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
                <svg
                  v-else
                  class="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span class="text-sm font-bold">{{
                  isDark ? "Light Mode" : "Dark Mode"
                }}</span>
              </div>

              <template #fallback>
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5"></div>
                  <span class="text-sm font-bold">Theme</span>
                </div>
              </template>
            </ClientOnly>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
