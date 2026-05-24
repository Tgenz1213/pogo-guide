<script setup lang="ts">
import { FetchError } from "ofetch";

const config = useRuntimeConfig();
const route = useRoute();
const isE2eMode = computed(
  () => config.public.e2eMode || route.query.test === "true",
);
const hasTurnstileSiteKey = computed(() =>
  Boolean(config.public.turnstileSiteKey),
);

const isHydrated = ref(false);
onMounted(() => {
  isHydrated.value = true;
});

const content = ref("");

const websiteAddress = ref("");
const turnstileToken = ref("");
const isSubmitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

const submitSuggestion = async () => {
  if (content.value.length < 10) {
    errorMessage.value = "Suggestion must be at least 10 characters long.";
    return;
  }

  if (!turnstileToken.value && !isE2eMode.value && hasTurnstileSiteKey.value) {
    errorMessage.value = "Please complete the security check to continue.";
    return;
  }

  isSubmitting.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    const data = await $fetch("/api/submit-suggestion", {
      method: "POST",
      body: {
        guidePath: route.path,
        content: content.value,
        websiteAddress: websiteAddress.value,
        turnstileToken: turnstileToken.value,
      },
    });

    if (data.success) {
      successMessage.value =
        "Thank you for your suggestion! An admin will review it.";
      content.value = "";
    } else {
      errorMessage.value = "Failed to submit suggestion. Please try again.";
    }
  } catch (err) {
    if (err instanceof FetchError) {
      errorMessage.value =
        err.data?.statusMessage || "Failed to submit suggestion.";
    } else {
      errorMessage.value = "An unexpected error occurred.";
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div
    class="mt-12 bg-slate-50 dark:bg-brand-bg/5 border border-white/10 rounded-xl p-6"
  >
    <h2 class="text-xl font-bold text-slate-900 dark:text-brand-text mb-2">
      Suggest an Edit
    </h2>
    <p class="text-sm text-slate-600 dark:text-slate-300 mb-4">
      Did we miss something? Found a typo? Let us know below.
    </p>

    <form class="space-y-4" @submit.prevent="submitSuggestion">
      <!-- Honeypot field (hidden from real users but bots will fill it) -->
      <div class="hidden" aria-hidden="true">
        <label for="websiteAddress"
          >Leave this field blank if you are human</label
        >
        <input
          id="websiteAddress"
          v-model="websiteAddress"
          type="text"
          tabindex="-1"
          autocomplete="off"
        />
      </div>

      <div>
        <label for="suggestionContent" class="sr-only"
          >Suggestion content</label
        >
        <textarea
          id="suggestionContent"
          v-model="content"
          rows="3"
          placeholder="I think you should add..."
          class="w-full bg-slate-50 dark:bg-brand-bg/5 border border-white/10 rounded-lg p-3 text-slate-900 dark:text-brand-text placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow resize-none"
          :disabled="isSubmitting"
        />
      </div>

      <div v-if="hasTurnstileSiteKey && !isE2eMode" class="mt-2">
        <NuxtTurnstile v-model="turnstileToken" />
      </div>

      <div class="flex items-center justify-between">
        <div class="text-sm">
          <span v-if="errorMessage" class="text-red-400">{{
            errorMessage
          }}</span>
          <span v-else-if="successMessage" class="text-green-400">{{
            successMessage
          }}</span>
          <span v-else class="text-gray-400">
            {{ content.length }} / 10 minimum
          </span>
        </div>
        <button
          type="submit"
          :disabled="!isHydrated || isSubmitting"
          class="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {{ isSubmitting ? "Submitting..." : "Submit" }}
        </button>
      </div>
    </form>
  </div>
</template>
