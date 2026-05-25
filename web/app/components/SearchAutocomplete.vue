<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

defineProps<{
  variant: "header" | "hero";
}>();

const router = useRouter();

// Replace with actual sanity client composable
const sanity = useSanity();

interface SearchResult {
  _id: string;
  title: string;
  slug: string;
  category: string | null;
}

const query = ref("");
const isOpen = ref(false);
const isLoading = ref(false);
const results = ref<SearchResult[]>([]);
const selectedIndex = ref(-1);

const containerRef = ref<HTMLElement | null>(null);

let timeoutId: ReturnType<typeof setTimeout> | null = null;
let currentRequestId = 0;

const closeSearch = () => {
  isOpen.value = false;
  selectedIndex.value = -1;
};

const handleOutsideClick = (event: MouseEvent) => {
  if (
    containerRef.value &&
    !containerRef.value.contains(event.target as Node)
  ) {
    closeSearch();
  }
};

onMounted(() => document.addEventListener("click", handleOutsideClick));
onUnmounted(() => document.removeEventListener("click", handleOutsideClick));

watch(query, (newVal) => {
  selectedIndex.value = -1;
  if (!newVal.trim()) {
    isOpen.value = false;
    results.value = [];
    return;
  }

  isOpen.value = true;
  isLoading.value = true;

  if (timeoutId) clearTimeout(timeoutId);

  timeoutId = setTimeout(async () => {
    const requestId = ++currentRequestId;
    try {
      const groqQuery = `*[_type == "guide" && title match $searchTerm + "*"][0...5] {
        _id, title, "slug": slug.current, "category": category->title
      }`;
      const data = await sanity.fetch(groqQuery, { searchTerm: newVal.trim() });

      // Only update if this is the most recent request
      if (requestId === currentRequestId) {
        results.value = data || [];
        isLoading.value = false;
      }
    } catch {
      if (requestId === currentRequestId) {
        results.value = [];
        isLoading.value = false;
      }
    }
  }, 1000);
});

const onKeyDown = () => {
  if (!isOpen.value || results.value.length === 0) return;
  if (selectedIndex.value < results.value.length - 1) {
    selectedIndex.value++;
  }
};

const onKeyUp = () => {
  if (!isOpen.value || results.value.length === 0) return;
  if (selectedIndex.value > 0) {
    selectedIndex.value--;
  }
};

const onEnter = () => {
  if (!isOpen.value) return;
  if (selectedIndex.value >= 0 && selectedIndex.value < results.value.length) {
    const selected = results.value[selectedIndex.value];
    if (selected) {
      goToGuide(selected);
    }
  } else if (results.value.length > 0) {
    // Default to first if none selected but pressed enter
    const first = results.value[0];
    if (first) {
      goToGuide(first);
    }
  }
};

const goToGuide = (guide: SearchResult) => {
  closeSearch();
  query.value = "";
  router.push(`/guides/${guide.slug}`);
};
</script>

<template>
  <div
    ref="containerRef"
    class="relative"
    :class="variant === 'hero' ? 'w-full z-10' : 'hidden sm:block z-0'"
  >
    <svg
      v-if="variant === 'header'"
      class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-brand-accent/50"
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
    <svg
      v-if="variant === 'hero'"
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
      v-model="query"
      type="search"
      :placeholder="
        variant === 'header'
          ? 'Search for a Pokémon, Move, or Event...'
          : 'Search for a guide or resource...'
      "
      :class="
        variant === 'header'
          ? 'w-72 bg-white dark:bg-brand-surface border border-slate-200 dark:border-brand-surface/50 rounded-full py-2 pl-10 pr-4 text-xs text-slate-900 dark:text-brand-text placeholder-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-mystic-blue transition-all'
          : 'w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-mystic-blue rounded-2xl py-4 pl-14 pr-6 text-brand-bg dark:text-brand-text placeholder-slate-500 dark:placeholder-brand-accent/80 font-semibold text-lg shadow-xl focus:outline-none transition-all'
      "
      @keydown.down.prevent="onKeyDown"
      @keydown.up.prevent="onKeyUp"
      @keydown.enter.prevent="onEnter"
      @keydown.esc.prevent="closeSearch"
      @focus="query.length > 0 ? (isOpen = true) : null"
    />

    <!-- Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute top-full left-0 w-full mt-2 bg-white dark:bg-brand-bg border border-slate-200 dark:border-brand-surface rounded-xl shadow-xl overflow-hidden flex flex-col z-[100]"
    >
      <div
        v-if="isLoading"
        class="p-4 text-center text-sm text-slate-500 dark:text-brand-accent font-medium"
      >
        Searching...
      </div>

      <div
        v-else-if="results.length === 0 && query.length > 0"
        class="p-4 text-center text-sm text-slate-500 dark:text-brand-accent font-medium"
      >
        No guides found for '{{ query }}'
      </div>

      <ul
        v-else-if="results.length > 0"
        class="flex flex-col py-2 max-h-80 overflow-y-auto"
      >
        <li
          v-for="(guide, index) in results"
          :key="guide._id"
          class="px-4 py-3 cursor-pointer transition-colors flex flex-col gap-1"
          :class="
            selectedIndex === index
              ? 'bg-slate-50 dark:bg-brand-surface'
              : 'hover:bg-slate-50 dark:hover:bg-brand-surface'
          "
          @click="goToGuide(guide)"
          @mouseenter="selectedIndex = index"
        >
          <span
            class="text-xs font-bold uppercase tracking-wider text-mystic-blue"
          >
            {{ guide.category || "Guide" }}
          </span>
          <span
            class="text-sm font-semibold text-slate-900 dark:text-brand-text"
          >
            {{ guide.title }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
