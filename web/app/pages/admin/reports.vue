<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-slate-900 dark:text-white">
        Guide Reports
      </h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Review content reports submitted by users.
      </p>
    </div>

    <!-- Status filter tabs -->
    <div
      class="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-700"
    >
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors"
        :class="
          statusFilter === tab.value
            ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        "
        @click="selectTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="pending" class="text-slate-500 dark:text-slate-400 py-8">
      Loading reports...
    </div>
    <div v-else-if="error" class="text-red-500 py-4">
      Failed to load reports: {{ error.message }}
    </div>
    <div
      v-else-if="!data?.reports?.length"
      class="text-slate-500 dark:text-slate-400 p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
    >
      No reports found for this filter.
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
              Guide
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >
              Reason
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell"
            >
              Reporter
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell"
            >
              Status
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell"
            >
              Reported At
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
            v-for="report in data.reports"
            :key="report.id"
            class="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
            @click="selectedReport = report"
          >
            <!-- Guide doc ID (truncated) -->
            <td
              class="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 dark:text-slate-400"
            >
              <span :title="report.sanityDocId">{{
                report.sanityDocId.slice(0, 10) + "…"
              }}</span>
            </td>

            <!-- Reason badge -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                :class="reasonClass(report.reason)"
              >
                {{ reasonLabel(report.reason) }}
              </span>
            </td>

            <!-- Reporter -->
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 hidden md:table-cell"
            >
              {{ report.reporterUsername ?? "Deleted user" }}
            </td>

            <!-- Status -->
            <td class="px-6 py-4 whitespace-nowrap hidden md:table-cell">
              <span
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                :class="statusClass(report.status)"
              >
                {{ report.status }}
              </span>
            </td>

            <!-- Date -->
            <td
              class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 hidden lg:table-cell"
            >
              {{ new Date(report.createdAt).toLocaleString() }}
            </td>

            <!-- Actions -->
            <td
              class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2"
            >
              <button
                v-if="report.status !== 'reviewed'"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                @click.stop="performAction(report.id, 'reviewed')"
              >
                Mark Reviewed
              </button>
              <button
                v-if="report.status !== 'dismissed'"
                class="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                @click.stop="performAction(report.id, 'dismissed')"
              >
                Dismiss
              </button>
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
        class="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md disabled:opacity-50"
        @click="page--"
      >
        Previous
      </button>
      <span class="text-slate-600 dark:text-slate-300"
        >Page {{ page }} of {{ data.totalPages }}</span
      >
      <button
        :disabled="page >= data.totalPages"
        class="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md disabled:opacity-50"
        @click="page++"
      >
        Next
      </button>
    </div>

    <AdminReportDetailModal
      v-if="selectedReport"
      :report="selectedReport"
      @close="selectedReport = null"
      @action="handleModalAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ReportRow } from "~/components/admin/AdminReportDetailModal.vue";

definePageMeta({
  layout: "admin",
  middleware: ["auth", "admin"],
});

const tabs = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Dismissed", value: "dismissed" },
] as const;

type StatusFilter = (typeof tabs)[number]["value"];

const page = ref(1);
const statusFilter = ref<StatusFilter>("all");
const selectedReport = ref<ReportRow | null>(null);

const { data, pending, error, refresh } = useFetch("/api/admin/reports", {
  query: { page, status: statusFilter },
  watch: [page, statusFilter],
});

function selectTab(value: StatusFilter) {
  statusFilter.value = value;
  page.value = 1;
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    inaccurate: "Inaccurate",
    spam: "Spam",
    copyright: "Copyright",
    inappropriate: "Inappropriate",
    other: "Other",
  };
  return map[reason] ?? reason;
}

function reasonClass(reason: string): string {
  const map: Record<string, string> = {
    inaccurate: "bg-yellow-100 text-yellow-800",
    spam: "bg-orange-100 text-orange-800",
    copyright: "bg-purple-100 text-purple-800",
    inappropriate: "bg-red-100 text-red-800",
    other: "bg-slate-100 text-slate-700",
  };
  return map[reason] ?? "bg-slate-100 text-slate-700";
}

function statusClass(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    reviewed: "bg-green-100 text-green-800",
    dismissed: "bg-slate-100 text-slate-600",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}

async function performAction(
  reportId: string,
  action: "reviewed" | "dismissed",
) {
  const label = action === "reviewed" ? "mark as reviewed" : "dismiss";
  if (!confirm(`Are you sure you want to ${label} this report?`)) return;

  try {
    await $fetch("/api/admin/reports/action", {
      method: "POST",
      body: { reportId, action },
    });
    refresh();

    // Update local selected report so modal reflects new status if kept open
    // or just close it. Closing it feels snappy.
    if (selectedReport.value?.id === reportId) {
      selectedReport.value = null;
    }
  } catch (err) {
    const fetchErr = err as { data?: { message?: string } };
    alert(fetchErr.data?.message ?? "Action failed");
  }
}

function handleModalAction(action: "reviewed" | "dismissed", reportId: string) {
  performAction(reportId, action);
}
</script>
