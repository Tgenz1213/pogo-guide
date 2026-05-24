<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const content = ref("");
const isSubmitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

const submitSuggestion = async () => {
  if (content.value.length < 10) {
    errorMessage.value = "Suggestion must be at least 10 characters long.";
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
    const error = err as { data?: { statusMessage?: string } };
    errorMessage.value =
      error.data?.statusMessage || "An unexpected error occurred.";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="mt-12 bg-white/5 border border-white/10 rounded-xl p-6">
    <h3 class="text-xl font-bold text-white mb-2">Suggest an Edit</h3>
    <p class="text-sm text-gray-400 mb-4">
      Did we miss something? Found a typo? Let us know below.
    </p>

    <form class="space-y-4" @submit.prevent="submitSuggestion">
      <div>
        <textarea
          v-model="content"
          rows="3"
          placeholder="I think you should add..."
          class="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow resize-none"
          :disabled="isSubmitting"
        />
      </div>

      <div class="flex items-center justify-between">
        <div class="text-sm">
          <span v-if="errorMessage" class="text-red-400">{{
            errorMessage
          }}</span>
          <span v-else-if="successMessage" class="text-green-400">{{
            successMessage
          }}</span>
        </div>
        <button
          type="submit"
          :disabled="isSubmitting || content.length < 10"
          class="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {{ isSubmitting ? "Submitting..." : "Submit" }}
        </button>
      </div>
    </form>
  </div>
</template>
