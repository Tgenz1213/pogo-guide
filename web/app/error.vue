<script setup lang="ts">
import type { NuxtError } from "#app";

defineProps({
  error: {
    type: Object as () => NuxtError,
    required: true,
  },
});

const handleError = () => clearError({ redirect: "/" });
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-brand-bg px-4 selection:bg-brand-accent selection:text-brand-bg font-sans"
  >
    <!-- Visual Glow Background -->
    <div
      class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-brand-bg to-brand-bg -z-10"
    ></div>

    <div
      class="relative w-full max-w-lg p-8 md:p-12 rounded-3xl bg-white dark:bg-brand-surface/40 border border-slate-700/60 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      <!-- Glow effect -->
      <div
        class="absolute -top-24 -left-24 w-48 h-48 bg-brand-accent/20 rounded-full blur-3xl pointer-events-none"
      ></div>
      <div
        class="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none"
      ></div>

      <div class="relative text-center space-y-6">
        <h1
          class="text-8xl md:text-9xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-amber-400 select-none animate-pulse"
        >
          {{ error.status || "404" }}
        </h1>

        <div class="space-y-2">
          <h2 class="text-2xl md:text-3xl font-bold text-slate-100">
            {{
              error.status === 404
                ? "Guide or Page Not Found"
                : error.message || "An unexpected error occurred"
            }}
          </h2>
          <p
            class="text-slate-400 text-sm md:text-base max-w-sm mx-auto leading-relaxed"
          >
            {{
              error.status === 404
                ? "The page or dynamic Pokemon GO reference guide you requested does not exist or has been relocated."
                : "Our edge workers encountered an issue while loading this page. Please try again later."
            }}
          </p>
        </div>

        <div class="pt-4">
          <button
            class="inline-flex items-center justify-center px-6 py-3 border border-slate-700 hover:border-slate-500 rounded-xl bg-slate-50 dark:bg-brand-bg text-slate-900 dark:text-brand-text font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(56,189,248,0.2)] hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
            @click="handleError"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
