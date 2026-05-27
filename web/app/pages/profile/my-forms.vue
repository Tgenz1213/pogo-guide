<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">My Submitted Forms</h1>

    <div v-if="pending" class="text-gray-500">Loading your submissions...</div>
    <div v-else-if="error" class="text-red-500">
      Failed to load submissions: {{ error.message }}
    </div>
    <div v-else-if="submissions?.length === 0" class="text-gray-500">
      You haven't submitted any forms yet.
    </div>

    <div
      v-else
      class="bg-white shadow rounded-lg overflow-hidden border border-gray-200"
    >
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Sanity Doc ID
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Submitted On
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="sub in submissions" :key="sub.id" class="hover:bg-gray-50">
            <td
              class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
            >
              {{ sub.sanityDocId }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <span
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                :class="{
                  'bg-yellow-100 text-yellow-800': sub.status === 'pending',
                  'bg-green-100 text-green-800': sub.status === 'published',
                  'bg-red-100 text-red-800': sub.status === 'rejected',
                }"
              >
                {{ sub.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(sub.createdAt).toLocaleDateString() }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { data: submissions, pending, error } = useFetch("/api/user/my-forms");
</script>
