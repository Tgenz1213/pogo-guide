<template>
  <div class="admin-sidebar" :class="{ collapsed: !isExpanded }">
    <!-- Logo / Back to site -->
    <div class="sidebar-header">
      <NuxtLink to="/" class="brand-link" title="Back to pogo.guide">
        <svg
          class="brand-icon"
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
        <Transition name="label-fade">
          <span v-if="isExpanded" class="brand-label"
            >pogo<span class="dot">.</span>guide</span
          >
        </Transition>
      </NuxtLink>
    </div>

    <!-- Navigation items -->
    <!-- eslint-disable vue/no-v-html -->
    <nav class="sidebar-nav" aria-label="Admin Navigation">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
        :title="!isExpanded ? item.label : undefined"
        @click="emit('navigated')"
      >
        <span class="nav-icon" v-html="item.icon" />
        <Transition name="label-fade">
          <span v-if="isExpanded" class="nav-label">{{ item.label }}</span>
        </Transition>
        <Transition name="label-fade">
          <span
            v-if="isExpanded && item.badge != null && item.badge > 0"
            class="nav-badge"
            >{{ item.badge }}</span
          >
        </Transition>
      </NuxtLink>
    </nav>
    <!-- eslint-enable vue/no-v-html -->

    <!-- Toggle button -->
    <button
      class="toggle-btn"
      :aria-label="isExpanded ? 'Collapse sidebar' : 'Expand sidebar'"
      @click="toggle"
    >
      <svg
        class="toggle-icon"
        :class="{ rotated: !isExpanded }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

export interface NavItem {
  to: string;
  label: string;
  /** Inline SVG string */
  icon: string;
  badge?: number;
}

defineProps<{
  navItems: NavItem[];
}>();

const emit = defineEmits<{
  toggle: [expanded: boolean];
  navigated: [];
}>();

const STORAGE_KEY = "admin-sidebar-expanded";
const isExpanded = ref(true);
const route = useRoute();

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    isExpanded.value = stored === "true";
  }
});

function toggle() {
  isExpanded.value = !isExpanded.value;
  localStorage.setItem(STORAGE_KEY, String(isExpanded.value));
  emit("toggle", isExpanded.value);
}

function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(to + "/");
}

// Expose for parent if needed
defineExpose({ isExpanded });
</script>

<style scoped>
.admin-sidebar {
  display: flex;
  flex-direction: column;
  width: 14rem; /* 224px expanded */
  min-height: 100vh;
  background: #0f172a; /* slate-900 */
  border-right: 1px solid #1e293b; /* slate-800 */
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.admin-sidebar.collapsed {
  width: 4rem; /* 64px — icon-only rail */
}

/* ── Header ─────────────────────────────────────────── */
.sidebar-header {
  height: 4rem;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  text-decoration: none;
  color: #e2e8f0; /* slate-200 */
  min-width: 0;
  overflow: hidden;
}

.brand-link:hover {
  color: #ffffff;
}

.brand-icon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  color: #818cf8; /* indigo-400 */
  transition: color 0.2s;
}

.brand-link:hover .brand-icon {
  color: #a5b4fc;
}

.brand-label {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  white-space: nowrap;
  color: #f1f5f9;
}

.dot {
  color: #f87171; /* red-400 */
}

/* ── Nav ─────────────────────────────────────────────── */
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.75rem 0.5rem;
  gap: 0.25rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  color: #94a3b8; /* slate-400 */
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  transition:
    background 0.15s,
    color 0.15s;
  position: relative;
}

.nav-item:hover {
  background: #1e293b;
  color: #e2e8f0;
}

.nav-item.active {
  background: #1e3a5f;
  color: #93c5fd; /* blue-300 */
}

.nav-item.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 25%;
  bottom: 25%;
  width: 3px;
  background: #60a5fa;
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.nav-icon :deep(svg) {
  width: 1.25rem;
  height: 1.25rem;
}

.nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-badge {
  background: #3b82f6;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  line-height: 1.4;
  flex-shrink: 0;
}

/* ── Toggle button ──────────────────────────────────── */
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0.75rem 0.5rem;
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: #475569; /* slate-600 */
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  flex-shrink: 0;
  align-self: stretch;
}

.toggle-btn:hover {
  background: #1e293b;
  color: #94a3b8;
}

.toggle-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

/* ── Transitions ─────────────────────────────────────── */
.label-fade-enter-active,
.label-fade-leave-active {
  transition:
    opacity 0.15s ease,
    width 0.15s ease;
}

.label-fade-enter-from,
.label-fade-leave-to {
  opacity: 0;
  width: 0;
  overflow: hidden;
}
</style>
