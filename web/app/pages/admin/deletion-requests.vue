<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
        Account Deletion Requests
      </h1>
    </div>

    <div v-if="pending" class="text-slate-500">Loading requests...</div>
    <div v-else-if="error" class="text-red-500">
      Failed to load requests: {{ error.message }}
    </div>
    <div
      v-else-if="requests?.length === 0"
      class="text-slate-500 dark:text-slate-400 p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
    >
      No pending deletion requests.
    </div>

    <div
      v-else
      class="bg-white dark:bg-slate-800 shadow rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700"
    >
      <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead class="bg-slate-50 dark:bg-slate-900/50">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >
              Request ID
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >
              User
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell"
            >
              Requested On
            </th>
            <th
              class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
          <tr
            v-for="req in requests"
            :key="req.id"
            class="hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <td
              class="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 dark:text-slate-400"
            >
              {{ req.id.split("-")[0] }}...
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-slate-900 dark:text-white">
                {{ req.username || "Unknown (Already Deleted)" }}
              </div>
              <div
                class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 w-24 md:w-48 truncate"
                :title="req.userId ?? undefined"
              >
                {{ req.userId }}
              </div>
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell"
            >
              {{ new Date(req.createdAt).toLocaleString() }}
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3"
            >
              <button
                class="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                @click="performAction(req.id, 'reject')"
              >
                Reject
              </button>
              <button
                class="text-red-600 hover:text-red-900 px-3 py-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                @click="performAction(req.id, 'approve')"
              >
                Approve Deletion
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

const {
  data: requests,
  pending,
  error,
  refresh,
} = useFetch("/api/admin/deletion-requests");

const performAction = async (requestId: string, action: string) => {
  const isApproving = action === "approve";
  if (
    isApproving &&
    !confirm(
      `Are you absolutely sure? Approving this will permanently delete the user and scrub their PII.`,
    )
  )
    return;
  if (!isApproving && !confirm(`Reject this deletion request?`)) return;

  try {
    await $fetch("/api/admin/deletion-requests/action", {
      method: "POST",
      body: { requestId, action },
    });
    refresh();
  } catch (err) {
    const error = err as { data?: { message?: string } };
    alert(error.data?.message || "Action failed");
  }
};
</script>
