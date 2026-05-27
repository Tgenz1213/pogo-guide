<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
        User Administration
      </h1>
      <NuxtLink
        to="/admin/deletion-requests"
        class="text-blue-600 hover:underline"
        >View Deletion Requests &rarr;</NuxtLink
      >
    </div>

    <div class="mb-6 flex gap-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search by username..."
        class="flex-1 max-w-md px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        @keyup.enter="executeSearch"
      />
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        @click="executeSearch"
      >
        Search
      </button>
    </div>

    <div v-if="pending" class="text-slate-500">Loading users...</div>
    <div v-else-if="error" class="text-red-500">
      Failed to load users: {{ error.message }}
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
              User
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell"
            >
              Joined
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell"
            >
              Admin
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
            v-for="user in data?.users"
            :key="user.id"
            class="hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-slate-900 dark:text-white">
                {{ user.username }}
              </div>
              <div
                class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 w-24 md:w-48 truncate"
                :title="user.id"
              >
                {{ user.id }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                :class="{
                  'bg-green-100 text-green-800': user.status === 'active',
                  'bg-yellow-100 text-yellow-800': user.status === 'warned',
                  'bg-red-100 text-red-800': user.status === 'banned',
                }"
              >
                {{ user.status }}
              </span>
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell"
            >
              {{ new Date(user.createdAt).toLocaleDateString() }}
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden sm:table-cell"
            >
              <span v-if="user.isAdmin" class="text-purple-600 font-bold"
                >Yes</span
              >
              <span v-else class="text-slate-400">No</span>
            </td>
            <td
              class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
            >
              <div class="inline-block text-left">
                <button
                  class="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  @click="toggleMenu(user.id, $event)"
                >
                  Actions &#9662;
                </button>
                <Teleport to="body">
                  <div
                    v-if="openActionMenuId === user.id"
                    class="fixed w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-[9999] flex flex-col py-1 overflow-hidden"
                    :style="menuStyle"
                  >
                    <button
                      class="px-4 py-2 text-left text-sm text-yellow-600 dark:text-yellow-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50"
                      :disabled="user.status === 'banned'"
                      @click="
                        performAction(user.id, 'warn');
                        openActionMenuId = null;
                      "
                    >
                      Warn User
                    </button>
                    <button
                      class="px-4 py-2 text-left text-sm text-red-600 dark:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50"
                      :disabled="user.status === 'banned'"
                      @click="
                        performAction(user.id, 'ban');
                        openActionMenuId = null;
                      "
                    >
                      Ban User
                    </button>
                    <button
                      class="px-4 py-2 text-left text-sm text-purple-600 dark:text-purple-500 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      @click="
                        performAction(user.id, 'make_admin');
                        openActionMenuId = null;
                      "
                    >
                      Toggle Admin
                    </button>
                  </div>
                </Teleport>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      v-if="data?.totalPages && data.totalPages > 1"
      class="mt-6 flex justify-between items-center"
    >
      <button
        :disabled="page <= 1"
        class="px-4 py-2 border border-slate-300 rounded-md disabled:opacity-50"
        @click="page--"
      >
        Previous
      </button>
      <span class="text-slate-600 dark:text-slate-300"
        >Page {{ page }} of {{ data.totalPages }}</span
      >
      <button
        :disabled="page >= data.totalPages"
        class="px-4 py-2 border border-slate-300 rounded-md disabled:opacity-50"
        @click="page++"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

definePageMeta({
  middleware: ["auth"], // Additional admin check happens in API, but middleware ensures login
});

const page = ref(1);
const search = ref("");
const searchQuery = ref("");
const openActionMenuId = ref<string | null>(null);
const menuStyle = ref({ top: "0px", right: "0px", left: "auto" });

const toggleMenu = (userId: string, event: MouseEvent) => {
  if (openActionMenuId.value === userId) {
    openActionMenuId.value = null;
    return;
  }
  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  menuStyle.value = {
    top: `${rect.bottom + window.scrollY + 4}px`,
    right: `${window.innerWidth - rect.right}px`,
    left: "auto",
  };
  openActionMenuId.value = userId;
};

const closeMenu = () => {
  openActionMenuId.value = null;
};
onMounted(() => document.addEventListener("click", closeMenu, true));
onUnmounted(() => document.removeEventListener("click", closeMenu, true));

const { data, pending, error, refresh } = useFetch("/api/admin/users", {
  query: { page, search },
  watch: [page, search],
});

const executeSearch = () => {
  page.value = 1;
  search.value = searchQuery.value;
};

const performAction = async (userId: string, action: string) => {
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;

  try {
    await $fetch("/api/admin/users/action", {
      method: "POST",
      body: { userId, action },
    });
    refresh();
  } catch (err) {
    const error = err as { data?: { message?: string } };
    alert(error.data?.message || "Action failed");
  }
};
</script>
