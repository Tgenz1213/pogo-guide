<template>
  <Teleport to="body">
    <div
      v-if="report"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-detail-title"
      @click.self="emit('close')"
    >
      <div class="modal-panel flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="modal-header shrink-0">
          <div>
            <h2 id="report-detail-title" class="modal-title">Report Details</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Reported on {{ new Date(report.createdAt).toLocaleString() }}
            </p>
          </div>
          <button class="modal-close" aria-label="Close" @click="emit('close')">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div
          class="modal-body overflow-y-auto flex-1 p-6 space-y-8 bg-slate-900 text-slate-200"
        >
          <!-- Report Info Section -->
          <section
            class="bg-slate-800 rounded-lg shadow-xs border border-slate-700 p-5"
          >
            <h3 class="text-lg font-semibold text-white mb-4">
              Report Information
            </h3>
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt class="font-medium text-slate-400">Reporter</dt>
                <dd class="mt-1 text-slate-200 font-mono">
                  {{ report.reporterUsername ?? "Deleted user" }}
                </dd>
              </div>
              <div>
                <dt class="font-medium text-slate-400">Status</dt>
                <dd class="mt-1">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="statusClass(report.status)"
                  >
                    {{ report.status }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="font-medium text-slate-400">Reason</dt>
                <dd class="mt-1">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="reasonClass(report.reason)"
                  >
                    {{ reasonLabel(report.reason) }}
                  </span>
                </dd>
              </div>
              <div class="md:col-span-2">
                <dt class="font-medium text-slate-400">Additional Details</dt>
                <dd
                  class="mt-1 text-slate-300 bg-slate-900 p-3 rounded-md border border-slate-800 whitespace-pre-wrap wrap-break-word"
                >
                  {{ report.details || "No additional details provided." }}
                </dd>
              </div>
            </dl>
          </section>

          <!-- Guide Content Section -->
          <section
            class="bg-slate-800 rounded-lg shadow-xs border border-slate-700 p-5"
          >
            <h3
              class="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-3"
            >
              Guide Under Review
            </h3>

            <div v-if="guidePending" class="py-8 text-center text-slate-500">
              Loading guide content...
            </div>
            <div v-else-if="guideError" class="py-8 text-center text-red-500">
              Failed to load guide from Sanity. It may have been deleted.
            </div>
            <div v-else-if="guide" class="guide-content-wrapper">
              <h4 class="text-xl font-bold text-white mb-2">
                {{ guide.title }}
              </h4>
              <p class="text-sm text-slate-400 mb-6 italic">
                {{ guide.description }}
              </p>

              <div class="prose prose-invert max-w-none guide-content">
                <PortableText v-if="guide.content" :value="guide.content" />
                <p v-else class="text-slate-400 italic">
                  No content available for this guide.
                </p>
              </div>
            </div>
            <div v-else class="py-8 text-center text-slate-500">
              Guide not found.
            </div>
          </section>
        </div>

        <!-- Footer Actions -->
        <div class="modal-footer shrink-0">
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-800 transition-colors"
              @click="emit('close')"
            >
              Close
            </button>
            <button
              v-if="report.status !== 'dismissed'"
              class="px-4 py-2 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-800 transition-colors"
              @click="handleAction('dismissed')"
            >
              Dismiss Report
            </button>
            <button
              v-if="report.status !== 'reviewed'"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
              @click="handleAction('reviewed')"
            >
              Mark Reviewed
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { PortableText } from "@portabletext/vue";
import type { Guide } from "~~/shared/types/sanity";

export interface ReportRow {
  id: string;
  sanityDocId: string;
  reporterUsername: string | null;
  status: "pending" | "reviewed" | "dismissed";
  reason: string;
  createdAt: number | string;
  details: string | null;
}

const props = defineProps<{
  report: ReportRow | null;
}>();

const emit = defineEmits<{
  close: [];
  action: [action: "reviewed" | "dismissed", reportId: string];
}>();

// Fetch the guide content from Sanity. Intentionally does NOT filter
// isHiddenByModeration (see docs/adr/0006-sanity-soft-deletes.md) — moderators
// reviewing a report need to see the guide even if it was already hidden,
// otherwise reports against already-moderated guides would show nothing here.
const guideQuery = groq`*[_type == "guide" && _id == $docId][0]`;

const {
  data: guide,
  pending: guidePending,
  error: guideError,
} = useSanityQuery<Guide>(guideQuery, {
  docId: props.report?.sanityDocId,
});

function handleAction(action: "reviewed" | "dismissed") {
  if (!props.report) return;
  emit("action", action, props.report.id);
}

// Helpers for badges
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
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fade-in 0.2s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-panel {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 56rem; /* 896px, quite wide to show the guide comfortably */
  overflow: hidden;
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slide-up {
  from {
    transform: translateY(20px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.5rem;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f8fafc;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: transparent;
  border-radius: 0.5rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: -0.5rem;
  margin-right: -0.5rem;
}

.modal-close:hover {
  background: #334155;
  color: #f8fafc;
}

.modal-close svg {
  width: 1.5rem;
  height: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  background: #1e293b;
  border-top: 1px solid #334155;
}

/* Guide content basic styling to match what we had in the main guide page */
.guide-content :deep(ul) {
  list-style-type: disc;
  margin-top: 1rem;
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}
.guide-content :deep(ol) {
  list-style-type: decimal;
  margin-top: 1rem;
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}
.guide-content :deep(li) {
  margin-top: 0.375rem;
  margin-bottom: 0.375rem;
}
.guide-content :deep(h2) {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  color: #f8fafc;
}
.guide-content :deep(h3) {
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.35;
  color: #f8fafc;
}
</style>
