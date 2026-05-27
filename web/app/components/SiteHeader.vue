<script setup lang="ts">
import { ref, computed } from "vue";
import SearchAutocomplete from "./SearchAutocomplete.vue";

const isMenuOpen = ref(false);
const isProfileMenuOpen = ref(false);

const closeProfileMenu = () => {
  isProfileMenuOpen.value = false;
};
const colorMode = useColorMode();
const { loggedIn, clear, user } = useUserSession();

const handleLogout = async () => {
  await clear();
  navigateTo("/");
};

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
        <NuxtLink
          to="/submit-guide"
          class="hover:text-green-500 transition-colors duration-200 flex items-center gap-1"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Submit Guide
        </NuxtLink>
        <div v-if="loggedIn" class="relative">
          <div
            v-if="isProfileMenuOpen"
            class="fixed inset-0 z-40"
            @click="closeProfileMenu"
          ></div>
          <button
            class="hover:text-blue-500 transition-colors duration-200 flex items-center gap-1 relative z-50"
            @click="isProfileMenuOpen = !isProfileMenuOpen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Profile
          </button>

          <div
            v-if="isProfileMenuOpen"
            class="absolute right-0 mt-2 w-48 bg-white dark:bg-brand-bg rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-slate-200 dark:border-brand-surface"
            @click="closeProfileMenu"
          >
            <NuxtLink
              to="/profile/my-forms"
              class="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-brand-text hover:bg-slate-100 dark:hover:bg-brand-surface transition-colors"
            >
              My Forms
            </NuxtLink>
            <NuxtLink
              to="/profile/settings"
              class="block px-4 py-2 text-sm font-semibold text-slate-700 dark:text-brand-text hover:bg-slate-100 dark:hover:bg-brand-surface transition-colors"
            >
              Settings
            </NuxtLink>
            <NuxtLink
              v-if="user?.isAdmin"
              to="/admin/users"
              class="block px-4 py-2 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
            >
              Admin Dashboard
            </NuxtLink>
            <div
              class="border-t border-slate-100 dark:border-brand-surface my-1"
            ></div>
            <button
              class="w-full text-left block px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              @click="handleLogout"
            >
              Logout
            </button>
          </div>
        </div>
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
          <NuxtLink
            to="/submit-guide"
            class="hover:text-green-500 transition-colors duration-200 block py-2 border-b border-slate-200 dark:border-brand-surface"
            @click="closeMenu"
          >
            Submit Guide
          </NuxtLink>
          <div
            v-if="loggedIn"
            class="border-b border-slate-200 dark:border-brand-surface pb-2"
          >
            <span
              class="block py-2 text-slate-900 dark:text-brand-text uppercase text-xs tracking-wider"
              >Profile</span
            >
            <NuxtLink
              to="/profile/my-forms"
              class="hover:text-blue-500 transition-colors duration-200 block py-2 pl-4"
              @click="closeMenu"
            >
              My Forms
            </NuxtLink>
            <NuxtLink
              to="/profile/settings"
              class="hover:text-blue-500 transition-colors duration-200 block py-2 pl-4"
              @click="closeMenu"
            >
              Settings
            </NuxtLink>
            <NuxtLink
              v-if="user?.isAdmin"
              to="/admin/users"
              class="hover:text-purple-500 transition-colors duration-200 block py-2 pl-4"
              @click="closeMenu"
            >
              Admin Dashboard
            </NuxtLink>
            <button
              class="w-full text-left text-red-500 hover:text-red-600 transition-colors duration-200 block py-2 pl-4 mt-1"
              @click="handleLogout"
            >
              Logout
            </button>
          </div>
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
