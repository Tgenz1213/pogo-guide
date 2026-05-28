<template>
  <div class="admin-shell">
    <!-- Mobile Header (Hidden on desktop) -->
    <header
      class="md:hidden flex items-center justify-between px-4 h-14 bg-slate-900 border-b border-slate-800 flex-shrink-0"
    >
      <NuxtLink
        to="/"
        class="flex items-center gap-2 text-slate-200 hover:text-white font-bold text-lg"
      >
        <svg
          class="w-5 h-5 text-indigo-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8l-4 4 4 4M8 12h8" />
        </svg>
        <span>pogo<span class="text-red-400">.</span>guide</span>
      </NuxtLink>
      <button
        class="p-2 text-slate-400 hover:text-white transition-colors"
        aria-label="Open menu"
        @click="mobileMenuOpen = true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-6 h-6"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </header>

    <div class="admin-body">
      <!-- Mobile Backdrop -->
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 md:hidden"
        @click="mobileMenuOpen = false"
      ></div>

      <!-- Sidebar Wrapper -->
      <div
        class="admin-sidebar-wrapper"
        :class="
          mobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full md:translate-x-0'
        "
      >
        <!-- Listen to route changes or custom events to close mobile menu if needed -->
        <AdminSidebar
          :nav-items="navItems"
          @navigated="mobileMenuOpen = false"
        />
      </div>

      <!-- Main Content -->
      <div class="admin-main">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { NavItem } from "~/components/admin/AdminSidebar.vue";

const mobileMenuOpen = ref(false);

const navItems: NavItem[] = [
  {
    to: "/admin/users",
    label: "Users",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,
  },
  {
    to: "/admin/deletion-requests",
    label: "Deletion Requests",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>`,
  },
  {
    to: "/admin/reports",
    label: "Guide Reports",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>`,
  },
];
</script>

<style scoped>
.admin-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #0f172a;
}

.admin-body {
  display: flex;
  flex: 1;
  overflow: hidden; /* prevents scroll on body, scroll happens inside main/sidebar */
  position: relative;
}

.admin-sidebar-wrapper {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
}

/* On desktop, the sidebar is statically positioned within the flex row */
@media (min-width: 768px) {
  .admin-sidebar-wrapper {
    position: static;
    z-index: 10;
  }
}

.admin-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background: #f8fafc; /* slate-50 */
  color: #0f172a;
  -webkit-overflow-scrolling: touch;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .admin-main {
    background: #0f172a;
    color: #f1f5f9;
  }
}

/* Nuxt color-mode class-based dark */
:global(.dark) .admin-main {
  background: #0f172a;
  color: #f1f5f9;
}
</style>
