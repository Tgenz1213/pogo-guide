<template>
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Account Settings</h1>

    <div
      class="bg-white shadow rounded-lg border border-red-200 overflow-hidden"
    >
      <div class="p-6 border-b border-gray-200 bg-red-50">
        <h2 class="text-xl font-semibold text-red-800 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 mr-2 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Danger Zone
        </h2>
      </div>
      <div class="p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          Request Account Deletion
        </h3>
        <p class="text-gray-600 mb-4">
          Requesting account deletion will queue your account for removal. This
          will permanently delete your personally identifiable information (PII)
          from our systems in accordance with GDPR. This action cannot be undone
          once approved by an admin.
        </p>

        <div
          v-if="successMessage"
          class="mb-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-md"
        >
          {{ successMessage }}
        </div>

        <div
          v-if="errorMessage"
          class="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md"
        >
          {{ errorMessage }}
        </div>

        <button
          :disabled="isSubmitting"
          class="inline-flex items-center px-4 py-2 border border-transparent font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
          @click="requestDeletion"
        >
          <span v-if="isSubmitting">Submitting...</span>
          <span v-else>Request Account Deletion</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

definePageMeta({
  middleware: ["auth"],
});

const isSubmitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

async function requestDeletion() {
  if (
    !confirm(
      "Are you sure you want to request account deletion? This action cannot be undone.",
    )
  ) {
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await $fetch("/api/user/deletion-request", {
      method: "POST",
    });
    successMessage.value =
      "Your account deletion request has been successfully submitted and is pending admin approval.";
  } catch (error) {
    const err = error as { data?: { message?: string } };
    errorMessage.value =
      err.data?.message ||
      "An error occurred while submitting your request. Please try again later.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>
