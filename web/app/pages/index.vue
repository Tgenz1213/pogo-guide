<script setup lang="ts">
import { computed } from "vue";
import SearchAutocomplete from "../components/SearchAutocomplete.vue";

interface GuideSummary {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  _updatedAt?: string;
}

// Fetch featured guides (using isFeatured boolean)
const featuredQuery = groq`*[_type == "guide" && isHiddenByModeration != true && isFeatured == true] | order(_updatedAt desc)[0...3] {
  _id,
  title,
  "slug": slug.current,
  description,
  "category": category->title
}`;

const { data: featuredGuidesData } =
  await useSanityQuery<GuideSummary[]>(featuredQuery);
const featuredGuides = computed(() => featuredGuidesData.value || []);

// Fetch recent guides
const recentQuery = groq`*[_type == "guide" && isHiddenByModeration != true] | order(_updatedAt desc)[0...3] {
  _id,
  title,
  "slug": slug.current,
  description,
  "category": category->title,
  _updatedAt
}`;

const { data: recentGuidesData } =
  await useSanityQuery<GuideSummary[]>(recentQuery);
const recentGuides = computed(() => recentGuidesData.value || []);

// Dynamic theme mapping based on index to replicate original styling
const themes = [
  {
    color: "text-mystic-blue",
    border: "border-mystic-blue/30",
    bg: "bg-mystic-blue/20",
    hover: "hover:border-mystic-blue",
    groupHover: "group-hover:text-mystic-blue",
    iconText: "text-blue-700 dark:text-mystic-blue",
  },
  {
    color: "text-valor-red",
    border: "border-valor-red/30",
    bg: "bg-valor-red/20",
    hover: "hover:border-valor-red",
    groupHover: "group-hover:text-valor-red",
    iconText: "text-red-700 dark:text-valor-red",
  },
  {
    color: "text-instinct-yellow",
    border: "border-instinct-yellow/30",
    bg: "bg-instinct-yellow/20",
    hover: "hover:border-instinct-yellow",
    groupHover: "group-hover:text-instinct-yellow",
    iconText: "text-amber-700 dark:text-instinct-yellow",
  },
];

const getTheme = (index: number) => {
  return themes[index % themes.length]!;
};

const timeAgo = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} months ago`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} years ago`;
};
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
        <div class="max-w-xl mt-8">
          <SearchAutocomplete variant="hero" />
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
          <NuxtLink
            v-for="(guide, idx) in featuredGuides"
            :key="guide._id"
            :to="`/guides/${guide.slug}`"
            class="p-6 rounded-2xl bg-slate-50 dark:bg-brand-bg border border-slate-200 dark:border-brand-surface flex items-start gap-4 shadow-lg group transition-colors cursor-pointer"
            :class="getTheme(idx).hover"
          >
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border"
              :class="[
                getTheme(idx).bg,
                getTheme(idx).border,
                getTheme(idx).color,
              ]"
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
                class="text-xs font-bold uppercase tracking-wider mb-1"
                :class="getTheme(idx).iconText"
              >
                {{ guide.category || "Guide" }}
              </div>
              <h3
                class="text-lg font-black text-slate-900 dark:text-brand-text transition-colors"
                :class="getTheme(idx).groupHover"
              >
                {{ guide.title }}
              </h3>
              <p
                class="text-sm text-slate-500 dark:text-brand-accent mt-2 line-clamp-2"
              >
                {{ guide.description }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Recent Updates -->
    <section class="max-w-7xl mx-auto px-6 py-20 space-y-8">
      <h2 class="text-2xl font-black text-slate-900 dark:text-brand-text">
        Recent Updates
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <NuxtLink
          v-for="guide in recentGuides"
          :key="guide._id"
          :to="`/guides/${guide.slug}`"
          class="group block p-6 rounded-3xl bg-white dark:bg-brand-surface/10 border border-slate-200 dark:border-brand-surface hover:border-mystic-blue/50 hover:bg-white dark:bg-brand-surface/30 transition-all duration-300 cursor-pointer"
        >
          <div class="flex items-center gap-3 mb-4">
            <span
              class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-50 dark:bg-brand-bg border border-slate-200 dark:border-brand-surface text-slate-500 dark:text-brand-accent group-hover:border-mystic-blue/30 group-hover:text-mystic-blue transition-colors"
            >
              {{ guide.category || "Guide" }}
            </span>
            <span
              class="text-xs font-semibold text-slate-600 dark:text-brand-accent"
              >{{ timeAgo(guide._updatedAt) }}</span
            >
          </div>

          <h3
            class="text-xl font-bold text-slate-900 dark:text-brand-text mb-3 group-hover:text-mystic-blue transition-colors"
          >
            {{ guide.title }}
          </h3>

          <p
            class="text-sm text-slate-500 dark:text-brand-accent leading-relaxed line-clamp-3"
          >
            {{ guide.description }}
          </p>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
